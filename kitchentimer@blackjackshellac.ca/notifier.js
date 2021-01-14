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

const { GLib, GObject } = imports.gi;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

// szm - from tea-time
imports.gi.versions.Gst = '1.0';
const Gst = imports.gi.Gst;

// for setInterval()
const Utils = Me.imports.utils;
const Logger = Me.imports.logger.Logger;

class Annoyer {
  constructor(timers) {
    this._settings = timers.settings;
  }

  notify(timer, fmt=undefined, ...args) {
    let source = new MessageTray.Source("Kitchen Timer", timer.timers.indicator.gicon /* icon name */);

    let details = fmt.undefined ? fmt : fmt.format(...args);
    let notification = new KitchenTimerNotifier(timer,
                                                source,
                                                timer.name,
                                                details,
                                                { gicon: timer.timers.indicator.gicon });
    notification.setTransient(false);
    Main.messageTray.add(source);

    if (this.notification) {
      source.showNotification(notification);
    }

    notification.connect('destroy', (notification) => {
      notification.stop_player();
    });
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
  _init(timer, source, title, banner, params) {
    super._init(source, title, banner, params);

    this.logger = new Logger('kt notifier', timer.timers.settings.debug);

    this._settings = timer.timers.settings;
    this._timer = timer;
    this._loops = 0;

    this.logger.debug('timer is %s', timer.expired ? "expired" : "not expired");
    if (timer.expired && this.sound_enabled) {
      this._initPlayer();

      // call callback manually to play a sound without waiting for the given interval to end
      this.playSound_callback(this);
      this._interval_id = Utils.setInterval(this.playSound_callback, 500, this);
    }
  }

	playSound_callback(ktn) {
	  //ktn.logger.debug("Entering playSound_callback after %d of %d loops", ktn._loops, ktn.sound_loops);

    var [ rv, state, pending ] = ktn._player.get_state(500000);
    //ktn.logger.debug("state=%s %s %s", ""+rv, ""+state, ""+pending)

    if (rv === Gst.StateChangeReturn.SUCCESS && state === Gst.State. PLAYING) {
      //ktn.logger.debug("Already playing, wait for the stream to end")
      return true;
    }

    ktn._player.set_property('uri', ktn._uri);
    ktn._player.set_state(Gst.State.PLAYING);

    //ktn.logger.debug("player gst state=%s", ""+ktn._player.get_state());

	  ktn._loops++;
	  if (ktn._loops >= ktn.sound_loops) {
	    //ktn.logger.debug("exiting callback after %d loops", ktn._loops);
      return ktn.stop_player();
	  }


	  return true;
	}

  stop_player() {
    if (this._interval_id) {
      this.logger.debug("Stopping player after %d loops: %d", this._loops, this._interval_id);
      Utils.clearInterval(this._interval_id);
      this._interval_id = undefined;
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
        base = this._settings.get_default('sound-file');
      }
      this._uri += GLib.build_filenamev([ Me.path, base ]);
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

  get sound_enabled() {
    return this._settings.play_sound;
  }

  get sound_loops() {
    return this._settings.sound_loops;
  }

  get sound_file() {
    return this._settings.sound_file
  }
});
