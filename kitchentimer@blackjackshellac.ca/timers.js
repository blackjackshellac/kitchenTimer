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

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Timeout = Me.imports.timeout;
const {GLib} = imports.gi;

class Timers extends Array {
  constructor(...args) {
    super(...args);

    this._interval_ms = 1000;
    this._sort_by_duration = true;
    this._sort_descending = false;
  }

  /*
  		var presets_sorted = [];
		for (var ke in this._presets) {
			var val = this._presets[ke];
			//log("ke="+ke+" time="+val);
		    presets_sorted.push([ke, val]);
		}

		presets_sorted.sort(function(a, b) {
		    return a[1] - b[1];
		});

		presets_sorted.forEach(Lang.bind(this, function(entry){
			let key = entry[0];
			let val = entry[1];
			//log("ke="+ke+" time="+val);
			let item = new PopupMenu.PopupMenuItem(_(key));
			let label = new St.Label();
			this._formatLabel(label, val);
			let bin = new St.Bin({
				x_expand: true,
				x_align: St.Align.END
			});
			bin.child = label;
			item.add(bin); //, { x_expand: true, x_align: St.Align.END });
			item.connect('activate', Lang.bind(this, function() {
				this._time = val;
				this._issuer = key;
				this._restartTimer();
			}));
			this._presetsSection.addMenuItem(item);
		}));
	}
	*/
  get timers() {
    // const cloneSheepsES6 = [...sheeps];
    var timers_array = [...this];
    if (this.sort_by_duration) {
      var direction= this.sort_descending ? 1 : -1;
      timers_array.sort( (a,b) => {
        return (a.duration-b.duration)*direction;
      });
    }
    return timers_array;
  }

  add(timer) {
    this.push(timer);
  }
}

const TimerState = {
  STOPPED: 0,
  STARTED: 1,
  ENDED: 2
}

class Timer {

  constructor(name, duration_secs, id=undefined) {
    this._name = name;
    this._duration_ms = duration_secs * 1000;
    this._state = TimerState.STOPPED;
    this._id = id == undefined ? name+duration_secs : id;
  }

  get duration() {
    return this._duration_ms;
  }

  isEmpty() {
    this.length === 0;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  try_end(timer) {
    var now = Date.now();
    var end = timer._end;
    var delta = end-now;
    log(`test end=${end} at ${now}`);
    if (now > end) {
      timer._state = TimerState.ENDED;
      log(`Timer ${timer._name} has ended`);
      Timeout.clearInterval(timer._interval_id);
      return false;
    } else {
      log(`Timer ${timer._name} has not ended: ${delta}`);
      return true;
    }
  }

  expired() {
    return (this._state == TimerState.ENDED);
  }

  start() {
    this._state = TimerState.STARTED;
    this._start = Date.now();
    this._end = this._start + this._duration_ms;

    log(`Starting timer ${this._name} at ${this._start}`);
    this._interval_id = Timeout.setInterval(this.try_end, this._interval_ms, this);
  }
}
