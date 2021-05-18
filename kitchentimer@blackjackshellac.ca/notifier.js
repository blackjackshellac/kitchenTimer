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

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const Params = imports.misc.params;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const { GLib, GObject, Gio, St } = imports.gi;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const NotificationDestroyedReason = MessageTray.NotificationDestroyedReason;
const PopupMenu = imports.ui.popupMenu;

// szm - from tea-time
imports.gi.versions.Gst = '1.0';
const Gst = imports.gi.Gst;
//const GstAudio = imports.gi.GstAudio;

// for setInterval()
const Utils = Me.imports.utils;
const Logger = Me.imports.logger.Logger;
const HMS = Me.imports.hms.HMS;

var Annoyer = class Annoyer {
  constructor(timers) {
    this._settings = timers.settings;
    this._source = this._createSource();

    //var policy = new MessageTray.NotificationPolicy({'show-in-lock-screen': true, 'details-in-lock-screen': true});
    //this._source.policy = policy;

    this.logger = new Logger('kt notifier', this._settings);

    this._gicon = Gio.icon_new_for_string('dialog-warning');

    this._source = this._createSource();

  }

  _createSource() {
    var source = new MessageTray.Source("Kitchen Timer", null /* icon name */);
    Main.messageTray.add(source);
    Main.messageTray._useLongerNotificationLeftTimeout = true;

    source.connect('destroy', (source) => {
      this.logger.debug("Kitchen Timer messageTray source destroyed, recreating");
      this._source = this._createSource();
    });

    return source;
  }

  warning(timer, text, fmt=undefined, ...args) {
    var source = this._createSource();

    let details = fmt === undefined ? "" : fmt.format(...args);

    var notifier = new KitchenTimerNotifier(timer,
                                              source,
                                              "Timer Warning: "+text,
                                              details,
                                              false,    // no sound
                                              { gicon: timer.timers.fullIcon, bannerMarkup: true,
                                              secondaryGIcon: this._gicon });

    source.showNotification(notifier);
  }

  notify(timer, text, fmt=undefined, ...args) {

    let details = fmt===undefined ? "" : fmt.format(...args);

    var notifier = new KitchenTimerNotifier(timer,
                                              this.source,
                                              text,
                                              details,
                                              true,   // sound
                                              { gicon: timer.timers.fullIcon, bannerMarkup: false });

    //notifier.setPrivacyScope(MessageTray.PrivacyScope.SYSTEM);

    if (this.notification) {
      this.source.showNotification(notifier);
    }

    notifier.connect('destroy', (notifier) => {
      notifier.stop_player();
    });
  }

  // MessageTray notification source
  get source() {
    return this._source;
  }

  get notification() {
    return this._settings.notification;
  }
}

// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/master/js/ui/messageTray.js
// Notification:
// @source: the notification's Source
// @title: the title
// @banner: the banner text
// @params: optional additional params
//
// Creates a notification. In the banner mode, the notification
// will show an icon, @title (in bold) and @banner, all on a single
// line (with @banner ellipsized if necessary).
//
// The notification will be expandable if either it has additional
// elements that were added to it or if the @banner text did not
// fit fully in the banner mode. When the notification is expanded,
// the @banner text from the top line is always removed. The complete
// @banner text is added as the first element in the content section,
// unless 'customContent' parameter with the value 'true' is specified
// in @params.
//
// Additional notification content can be added with addActor() and
// addBody() methods. The notification content is put inside a
// scrollview, so if it gets too tall, the notification will scroll
// rather than continue to grow. In addition to this main content
// area, there is also a single-row action area, which is not
// scrolled and can contain a single actor. The action area can
// be set by calling setActionArea() method. There is also a
// convenience method addButton() for adding a button to the action
// area.
//
// If @params contains a 'customContent' parameter with the value %true,
// then @banner will not be shown in the body of the notification when the
// notification is expanded and calls to update() will not clear the content
// unless 'clear' parameter with value %true is explicitly specified.
//
// By default, the icon shown is the same as the source's.
// However, if @params contains a 'gicon' parameter, the passed in gicon
// will be used.
//
// You can add a secondary icon to the banner with 'secondaryGIcon'. There
// is no fallback for this icon.
//
// If @params contains 'bannerMarkup', with the value %true, a subset (<b>,
// <i> and <u>) of the markup in [1] will be interpreted within @banner. If
// the parameter is not present, then anything that looks like markup
// in @banner will appear literally in the output.
//
// If @params contains a 'clear' parameter with the value %true, then
// the content and the action area of the notification will be cleared.
// The content area is also always cleared if 'customContent' is false
// because it might contain the @banner that didn't fit in the banner mode.
//
// If @params contains 'soundName' or 'soundFile', the corresponding
// event sound is played when the notification is shown (if the policy for
// @source allows playing sounds).
//
// [1] https://developer.gnome.org/notification-spec/#markup
// var Notification = GObject.registerClass({
//     Properties: {
//         'acknowledged': GObject.ParamSpec.boolean(
//             'acknowledged', 'acknowledged', 'acknowledged',
//             GObject.ParamFlags.READWRITE,
//             false),
//     },
//     Signals: {
//         'activated': {},
//         'destroy': { param_types: [GObject.TYPE_UINT] },
//         'updated': { param_types: [GObject.TYPE_BOOLEAN] },
//     },
// }, class Notification extends GObject.Object {
//     _init(source, title, banner, params) {
//         super._init();

    // update:
    // @title: the new title
    // @banner: the new banner
    // @params: as in the Notification constructor
    //
    // Updates the notification by regenerating its icon and updating
    // the title/banner. If @params.clear is %true, it will also
    // remove any additional actors/action buttons previously added.
    // update(title, banner, params) {
    //     params = Params.parse(params, { gicon: null,
    //                                     secondaryGIcon: null,
    //                                     bannerMarkup: false,
    //                                     clear: false,
    //                                     datetime: null,
    //                                     soundName: null,
    //                                     soundFile: null });




var KitchenTimerNotifier = GObject.registerClass(
class KitchenTimerNotifier extends MessageTray.Notification {
  _init(timer, source, title, banner, play_sound, params) {
    super._init(source, title, banner, params);

    this.logger = new Logger('kt notifier', timer.timers.settings);

    this._settings = timer.timers.settings;
    this._timer = timer;
    this._loops = 0;
    this._sound_loops = timer.persist_alarm ? 0 : this.settings.sound_loops;

    if (this.settings.notification === false && this._sound_loops == 0) {
      // prevent infinite sound loops if notification dialog is turned off
      this._sound_loops = 2;
    }

    this._banner = new KitchenTimerNotifierBanner(this);

    this.logger.debug('timer is %s', timer.expired ? "expired" : "not expired");
    if (timer.expired) {
      if (this.settings.notification_sticky) {
        this.setResident(true);
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

    this._banner.connect('clicked', (banner) => {
      this.logger.debug("Clicked!");
      banner.close();
    });
  }

  _addActions() {
    this.logger.debug("Adding notification actions");
    this.setForFeedback(true);
    this.setTransient(false);
    this.acknowledged = false;

    this._long_timeout = Utils.setTimeout(this.longTimeout_callback, this.settings.notification_longtimeout, this);

    this._banner.addAction(_("Restart timer %s").format(this.timer.name), () => {
      this.logger.debug("Restart timer");
      this.acknowledged = true;
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
      this._banner.addSnoozeSecs(snoozeLimits[25], this.snoozeCallback);
      this._banner.addSnoozeSecs(snoozeLimits[10], this.snoozeCallback);
      return;
    } else if (this.timer.duration < round*2) {
      return;
    }

    if (!this.addSnoozeButtons(round, snoozeLimits)) {
      // add a 30 second snooze
      this.logger.debug("Add default snooze of %d seconds", round);
      this._banner.addSnoozeSecs(round, this.snoozeCallback);
    }
  }

  snoozeCallback(notifier, secs) {
    notifier.logger.debug("💤 %d seconds", secs);
    notifier.acknowledged = true;
    notifier.timer.snooze(secs);
    notifier.destroy();
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
      ssecs = this._banner.addSnoozePercent(percentage, limit, round, this.snoozeCallback);
      if (ssecs <= round) {
        this.logger.debug("Won't create snooze for ssecs=%d", ssecs);
        break;
      }
    }
    return ssecs == 0 ? false : true;
  }

  createBanner() {
    return this._banner;
  }

  longTimeout_callback(ktNotifier) {
    ktNotifier.acknowledged = true;
    ktNotifier.destroy();
    Utils.clearTimeout(ktNotifier._long_timeout);
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
        base = this.settings.get_default('sound-file');
      }
      this._uri += GLib.build_filenamev([ Me.path, base ]);
    }

    this.logger.debug("initPlayer with uri=%s", this._uri);
    Gst.init(null);
    this._player  = Gst.ElementFactory.make("playbin","player");
    //let vol = this._player.get_volume(GstAudio.StreamVolumeFormat.LINEAR) *100;
    //this.logger.debug("linear volume is %f", vol);

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

  destroy(reason = NotificationDestroyedReason.DISMISSED) {
    if (!this.acknowledged) {
      this.logger.debug("Not acknowledged yet");
      return;
    }
    if (!this._destroyed) {
      this.logger.debug("Acknowledged notification will be destroyed");
      this._destroyed = true;
      this.stop_player();
      super.destroy(reason);

      this.timer.uninhibit();

    }
  }
});

var KitchenTimerNotifierBanner = GObject.registerClass(
class KitchenTimerNotifierBanner extends MessageTray.NotificationBanner {
  _init(notifier) {
    this.logger = new Logger('kt notifierbanner', notifier.timer.timers.settings);
    this.logger.debug("constructor");

    super._init(notifier);

    super.notification = this.notifier = notifier;
  }

  get notifier() {
    return this._notifier;
  }

  set notifier(n) {
    this._notifier = n;
  }

  // copied from MessageTray.NotificationBanner
  addButton(button) {
    // should call the layoutbox _buttonBox
    if (!this._buttonBox) {
        this._buttonBox = new St.BoxLayout({ style_class: 'notification-actions',
                                             x_expand: true });
        this.setActionArea(this._buttonBox);
        global.focus_manager.add_group(this._buttonBox);
    }

    if (this._buttonBox.get_n_children() > 3 /* MAX_NOTIFICATION_BUTTONS */)
        return null;

    this._buttonBox.add(button);

    return button;
  }

  // copied from MessageTray.NotificationBanner
  addAction(label, callback) {
    this.logger.debug("Create button %s", label);
    let button = new St.Button({ style_class: 'notification-button',
                                 label,
                                 x_expand: true,
                                 can_focus: true });

    if (this.addButton(button)) {
      button.connect('clicked', () => {
        callback();

        // if (!this.notification.resident) {
          // We don't hide a resident notification when the user invokes one of its actions,
          // because it is common for such notifications to update themselves with new
          // information based on the action. We'd like to display the updated information
          // in place, rather than pop-up a new notification.
        //   this.emit('done-displaying');
        //   this.notification.destroy();
        // }
      });
    }
  }

  addSnoozeSecs(snooze, callback) {
    let hms = new HMS(snooze);
    let label = "💤 %s".format(hms.toString(true));
    this.logger.debug("Create snooze button menu %s", label);
    let button = new St.Button({ style_class: 'notification-button',
                                 label,
                                 x_expand: true,
                                 can_focus: true });

    if (this.addButton(button)) {
      button.snooze = snooze;
      button.connect('clicked', (button) => {

        callback(this.notifier, button.snooze);

        // if (!this.notification.resident) {
          // We don't hide a resident notification when the user invokes one of its actions,
          // because it is common for such notifications to update themselves with new
          // information based on the action. We'd like to display the updated information
          // in place, rather than pop-up a new notification.
        //   this.emit('done-displaying');
        //   this.notification.destroy();
        // }
      });
      return snooze;
    }
    return 0;
  }

  addSnoozePercent(percent, limit, round, callback) {
    let snooze = Math.ceil(this.notifier.timer.duration * percent / 100);

    if (this.notifier.timer.alarm_timer || snooze > limit) {
      snooze = limit;
    } else if (snooze < 30) {
      return 0;
    }

    // snooze to the next nearest 30 seconds
    snooze = Math.ceil(snooze/round)*round;
    return this.addSnoozeSecs(snooze, callback);
  }
});

