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

// TODO get rid
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {GLib} = imports.gi;
const Main = imports.ui.main;

// szm - from tea-time
imports.gi.versions.Gst = '1.0';
const Gst = imports.gi.Gst;

// for setInterval()
const Utils = Me.imports.utils;

class Annoyer {
  constructor(settings) {
    this._settings = settings;
    this._initPlayer();
  }

  annoy(msg) {
    if (this.notification) {
      Main.notify(msg);
    }
    this._playSound();
  }

	_playSound() {
		if (!this.sound_enabled) {
		  log('sound not enabled');
		  return;
		}
	  // this._notifyUser("Playing uri="+uri);
	  log(`Playing ${this.sound_file}`);
	  this._player.set_property('uri', "file://"+this.sound_file);
	  this._player.set_state(Gst.State.PLAYING);
	}

  get notification() {
    return this._settings.notification;
  }

  get sound_enabled() {
    return this._settings.sound_loops > 0;
  }

  get sound_loops() {
    return this._settings.sound_loops;
  }

  get sound_file() {
    return this._settings.sound_file
  }

  _initPlayer() {
    if (this._player !== undefined) {
      return;
    }
    Gst.init(null);
    this._player  = Gst.ElementFactory.make("playbin","player");
    this.playBus = this._player.get_bus();
    this.playBus.add_signal_watch();
    this.playBus.connect("message", Lang.bind(this, function(playBus, message) {
	    if (message != null) {
		    // IMPORTANT: to reuse the player, set state to READY
		    let t = message.type;
		    if (t == Gst.MessageType.EOS || t == Gst.MessageType.ERROR) {
			    this._player.set_state(Gst.State.READY);
		    }

		    // TODO use setTimeout to loop playSound
		    // if ( t == Gst.MessageType.EOS && this._sound_loop ) {
			   //  this._player.set_state(Gst.State.READY);
			   //  this._player.set_property('uri', this.sound_file);
			   //  this._player.set_state(Gst.State.PLAYING);
		    // }
	    } // message handler
    }));

  }
}
