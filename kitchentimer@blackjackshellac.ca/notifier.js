/*
 * Kitchen Timer: Gnome Shell Kitchen Timer Extension
 * Copyright (C) 2021 Steeve McCauley
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
// szm - from tea-time
import Gst from 'gi://Gst?version=1.0';
import Gettext from 'gettext';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

// for setInterval()
import * as Utils from './utils.js';
import {Logger} from './logger.js';
import {HMS} from './hms.js';
import {getExtension} from './context.js';

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';
const _ = Gettext.domain(GETTEXT_DOMAIN).gettext;

// gnome-shell shows at most this many buttons on a notification
const MAX_NOTIFICATION_BUTTONS = 3;

export class Annoyer {
  constructor(timers) {
    this._timers = timers;
    this._settings = timers.settings;
    this._source = null;

    this.logger = new Logger('kt notifier', this._settings);

    this._gicon = Gio.icon_new_for_string('dialog-warning');
  }

  // MessageTray notification source, the shell destroys it once its last
  // notification is gone so it is recreated on demand
  get source() {
    if (!this._source) {
      this._source = new MessageTray.Source({
        title: "Kitchen Timer",
        icon: this._timers.fullIcon
      });
      this._source.connect('destroy', () => {
        this.logger.debug("Kitchen Timer messageTray source destroyed");
        this._source = null;
      });
      Main.messageTray.add(this._source);
    }
    return this._source;
  }

  warning(timer, text, fmt=undefined, ...args) {
    let details = fmt === undefined ? "" : fmt.format(...args);

    var notifier = new KitchenTimerNotifier(timer, {
      source: this.source,
      title: "Timer Warning: "+text,
      body: details,
      gicon: this._gicon,
      useBodyMarkup: true
    }, false);    // no sound

    this.source.addNotification(notifier);
  }

  notify(timer, text, fmt=undefined, ...args) {

    let details = fmt===undefined ? "" : fmt.format(...args);

    var notifier = new KitchenTimerNotifier(timer, {
      source: this.notification ? this.source : null,
      title: text,
      body: details,
      gicon: timer.timers.fullIcon
    }, true);   // sound

    if (this.notification) {
      this.source.addNotification(notifier);
    }
  }

  get notification() {
    return this._settings.notification;
  }

  // Ongoing low urgency notification with the countdown of running timers.
  // The lock screen lists unseen notifications and keeps the source title
  // up to date, so the countdown lives in the source title. Called on every
  // timer tick, also while the screen is locked and the indicator detached.
  update_countdown() {
    var running = this._timers.sort_by_running();
    if (running.length === 0) {
      this._countdown_dismissed = false;
      this._clear_countdown();
      return;
    }
    if (!this._settings.lock_screen_countdown || this._countdown_dismissed) {
      this._clear_countdown();
      return;
    }

    var title = running.map(t => "%s %s".format(t.name.trim(), t.remaining_hms().toString(true))).join(" · ");
    var body = running.map(t => _("due at %s").format(t.end_time())).join(" · ");

    if (!this._countdown) {
      this._create_countdown(title, body);
      return;
    }
    if (this._countdown_source.title !== title) {
      this._countdown_source.title = title;
      this._countdown.title = title;
    }
    if (this._countdown.body !== body) {
      this._countdown.body = body;
    }
  }

  _create_countdown(title, body) {
    var source = new MessageTray.Source({
      title: title,
      icon: this._timers.fullIcon
    });
    source.connect('destroy', () => {
      this._countdown_source = null;
    });
    Main.messageTray.add(source);

    // low urgency notifications never show a banner
    var notification = new MessageTray.Notification({
      source: source,
      title: title,
      body: body,
      gicon: this._timers.fullIcon,
      urgency: MessageTray.Urgency.LOW,
      resident: true
    });
    // opening the notification list acknowledges all notifications, but the
    // lock screen only shows unseen ones
    notification.connect('notify::acknowledged', () => {
      if (notification.acknowledged && this._countdown === notification) {
        notification.acknowledged = false;
      }
    });
    notification.connect('destroy', () => {
      if (this._countdown !== notification) {
        return;
      }
      this._countdown = null;
      if (!this._clearing_countdown) {
        // dismissed by the user, don't bring it back for these timers
        this.logger.debug("Countdown notification dismissed");
        this._countdown_dismissed = true;
      }
    });
    source.addNotification(notification);

    this._countdown_source = source;
    this._countdown = notification;
  }

  _clear_countdown() {
    if (this._countdown) {
      this._clearing_countdown = true;
      this._countdown.destroy();
      this._clearing_countdown = false;
    }
  }
}

const KitchenTimerNotifier = GObject.registerClass(
class KitchenTimerNotifier extends MessageTray.Notification {
  constructor(timer, params, play_sound) {
    super(params);

    this.logger = new Logger('kt notifier', timer.timers.settings);

    this._settings = timer.timers.settings;
    this._timer = timer;
    this._loops = 0;
    this._sound_loops = timer.persist_alarm ? 0 : this.settings.sound_loops;

    if (this.settings.notification === false && this._sound_loops == 0) {
      // prevent infinite sound loops if notification dialog is turned off
      this._sound_loops = 2;
    }

    this.logger.debug('timer is %s', timer.expired ? "expired" : "not expired");
    if (timer.expired) {
      if (this.settings.notification_sticky) {
        this.resident = true;
        this.urgency = MessageTray.Urgency.CRITICAL;
      }
      if (play_sound && this.sound_enabled) {
        this._initPlayer();

        // call callback manually to play a sound without waiting for the given interval to end
        this.playSound_callback(this);
        this._interval_id = Utils.setInterval(this.playSound_callback, 500, this);
      }
      this._addActions();
    } else {
      timer.uninhibit();
    }

    // resident notifications are not closed by the shell when clicked
    this.connect('activated', () => {
      this.logger.debug("Clicked!");
      this.destroy();
    });
  }

  _addActions() {
    this.logger.debug("Adding notification actions");
    this.forFeedback = true;
    this.isTransient = false;

    // sticky notifications wait for input, others are closed after a while
    if (!this.resident) {
      this._long_timeout = Utils.setTimeout(this.longTimeout_callback, this.settings.notification_longtimeout, this);
    }

    this.addAction(_("Restart timer %s").format(this.timer.name), () => {
      this.logger.debug("Restart timer");
      this.timer.start();
      this.destroy();
    });

    let round=30;
    // TODO add to settings eventually
    let snoozeLimits = {
      25: 900,
      10: 600,
       5: 300
    };

    if (this.timer.alarm_timer) {
      this.addSnoozeSecs(snoozeLimits[25]);
      this.addSnoozeSecs(snoozeLimits[10]);
      return;
    } else if (this.timer.duration < round*2) {
      return;
    }

    if (!this.addSnoozeButtons(round, snoozeLimits)) {
      // add a 30 second snooze
      this.logger.debug("Add default snooze of %d seconds", round);
      this.addSnoozeSecs(round);
    }
  }

  snooze(secs) {
    this.logger.debug("💤 %d seconds", secs);
    this.timer.snooze(secs);
    this.destroy();
  }

  addSnoozeButtons(round, snoozeLimits) {
    let ssecs;

    // sort snooze limits by percentage from large to small
    let percentages=Object.keys(snoozeLimits).
      sort( (k1,k2) => {
        return k2-k1;
      });

    // timer.duration_secs * 25%, 10% and 5%
    for (let i=0; i < percentages.length; i++) {
      let percentage = percentages[i];
      let limit = snoozeLimits[percentage];
      ssecs = this.addSnoozePercent(percentage, limit, round);
      if (ssecs <= round) {
        this.logger.debug("Won't create snooze for ssecs=%d", ssecs);
        break;
      }
    }
    return ssecs == 0 ? false : true;
  }

  addSnoozeSecs(snooze) {
    if (this.actions.length >= MAX_NOTIFICATION_BUTTONS) {
      return 0;
    }
    let hms = new HMS(snooze);
    let label = "💤 %s".format(hms.toString(true));
    this.logger.debug("Create snooze button %s", label);
    this.addAction(label, () => {
      this.snooze(snooze);
    });
    return snooze;
  }

  addSnoozePercent(percent, limit, round) {
    let snooze = Math.ceil(this.timer.duration * percent / 100);

    if (this.timer.alarm_timer || snooze > limit) {
      snooze = limit;
    } else if (snooze < 30) {
      return 0;
    }

    // snooze to the next nearest 30 seconds
    snooze = Math.ceil(snooze/round)*round;
    return this.addSnoozeSecs(snooze);
  }

  longTimeout_callback(ktNotifier) {
    ktNotifier._long_timeout = undefined;
    ktNotifier.destroy();
    return false;
  }

	playSound_callback(ktNotifier) {
	  //ktNotifier.logger.debug("Entering playSound_callback after %d of %d loops", ktNotifier._loops, ktNotifier.sound_loops);

    var [ rv, state, pending ] = ktNotifier._player.get_state(500000);
    //ktNotifier.logger.debug("state=%s %s %s", ""+rv, ""+state, ""+pending)

    if (rv === Gst.StateChangeReturn.SUCCESS && state === Gst.State. PLAYING) {
      //ktNotifier.logger.debug("Already playing, wait for the stream to end")
      return true;
    }

    // if sound_loops == 0, play for duration of notification
	  if (ktNotifier.sound_loops > 0 && ktNotifier._loops >= ktNotifier.sound_loops) {
	    //ktNotifier.logger.debug("exiting callback after %d loops", ktNotifier._loops);
      return ktNotifier.stop_player();
	  }

    // play it (again), Sam
    ktNotifier._player.set_property('uri', ktNotifier._uri);
    ktNotifier._player.set_state(Gst.State.PLAYING);
	  ktNotifier._loops++;

	  return true;
	}

  stop_player() {
    if (this._interval_id) {
      this.logger.debug("Stopping player after %d loops: %d", this._loops, this._interval_id);
      Utils.clearInterval(this._interval_id);
      this._interval_id = undefined;
      this.timer.persist_alarm = false;
    }
    return false;
  }

  _initPlayer() {
    if (this._player) {
      this.logger.debug("Player is already initialized")
      return;
    }
    this._uri="file://";
    if (GLib.file_test(this.sound_file, GLib.FileTest.EXISTS)) {
      this._uri += this.sound_file;
    } else {
      var base = GLib.path_get_basename(this.sound_file);
      if (base !== this.sound_file) {
        this.logger.error("Sound file not found, use default");
        base = this.settings.get_default('sound-file').unpack();
      }
      this._uri += GLib.build_filenamev([ getExtension().path, base ]);
    }

    this.logger.debug("initPlayer with uri=%s", this._uri);
    Gst.init(null);
    this._player  = Gst.ElementFactory.make("playbin","player");

    this.playBus = this._player.get_bus();
    this.playBus.add_signal_watch();
    this.playBus.connect('message', (playBus, message) => {
	    if (message != null) {
		    // IMPORTANT: to reuse the player, set state to READY
		    let message_type = message.type;
		    if (message_type == Gst.MessageType.EOS || message_type == Gst.MessageType.ERROR) {
			    this._player.set_state(Gst.State.READY);
		    }
	    } // message handler
    });
  }

  _releasePlayer() {
    if (this._player) {
      this.playBus.remove_signal_watch();
      this._player.set_state(Gst.State.NULL);
      this._player = undefined;
      this.playBus = undefined;
    }
  }

  get settings() {
    return this._settings;
  }

  get timer() {
    return this._timer;
  }

  get sound_enabled() {
    return this.settings.play_sound;
  }

  get sound_loops() {
    return this._sound_loops;
  }

  get sound_file() {
    return this.settings.sound_file
  }

  destroy(reason = MessageTray.NotificationDestroyedReason.DISMISSED) {
    // actions and activation may try to destroy an already destroyed notification
    if (this._kt_destroyed) {
      return;
    }
    this.logger.debug("Notification will be destroyed");
    this._kt_destroyed = true;
    this.stop_player();
    this._releasePlayer();
    if (this._long_timeout) {
      Utils.clearTimeout(this._long_timeout);
      this._long_timeout = undefined;
    }
    this.timer.uninhibit();
    super.destroy(reason);
  }
});
