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

var HMS = class HMS {
  constructor(secs=0) {
    if (isNaN(secs)) {
    }
    this._secs = Number(secs);
    this._hours = Math.floor(secs / 3600);
    this._minutes = Math.floor(secs % 3600 / 60);
    this._seconds = Math.floor(secs % 3600 % 60);
  }

  static fromString(hms_text) {
    var array = hms_text.split(/:/);
    var h=0;
    var m=0;
    var s=0;
    if (array.length == 3) {
      h = array[0];
      m = array[1];
      s = array[2];
    } else if (array.length == 2) {
      m = array[0];
      s = array[1];
    } else if (array.length == 1) {
      s = array[0];
    } else {
      return undefined;
    }
    if (isNaN(h) || isNaN(m) || isNaN(s)) {
      throw 'Parameter to HMS.fromString(%s) is not a valid time %s:%s:%s'.format(hms_text, h, m, s);
    }
    return HMS.create(h, m, s);
  }

  static create(h,m,s) {
    if (!h) { h=0; }
    if (!m) { m=0; }
    if (!s) { s=0; }
    if (isNaN(h) || isNaN(m) || isNaN(s)) {
      throw 'Parameter to HMS.create(%s,%s,%s) is not a number'.format(h, m, s);
    }
    return new HMS(Number(h)*3600+Number(m)*60+Number(s));
  }

  static to_s(v) {
    if (v == 0) {
      return "00";
    }
    if (v < 10) {
      return "0"+v;
    }
    return ""+v;
  }

  h2s() {
    return HMS.to_s(this._hours);
  }

  m2s() {
    return HMS.to_s(this._minutes);
  }

  s2s() {
    return HMS.to_s(this._seconds);
  }

  adjust_minutes(mins) {
    if (mins > 59) {
      this.adjust_seconds(mins*60);
    } else {
      this._minutes = mins;
    }
  }

  adjust_seconds(secs) {
    var hms = new HMS(secs);
    this._seconds = hms.seconds;
    this._minutes += hms.minutes;
    this._hours += hms.hours;
    this.adjust();
  }

  adjust() {
    var hms = new HMS(this.toSeconds());
    this._seconds = hms.seconds;
    this._minutes = hms.minutes;
    this._hours = hms.hours;
  }

  get hours() {
    return this._hours;
  }

  set hours(hours) {
    this._hours = hours;
  }

  get minutes() {
    return this._minutes;
  }

  set minutes(minutes) {
    this._minutes = minutes;
  }

  get seconds() {
    return this._seconds;
  }

  set seconds(seconds) {
    this._seconds = seconds;
  }

  toSeconds() {
    return this._hours*3600 + this._minutes*60 + this._seconds;
  }

  pretty() {
    return `${this.toString()} is ${this.toSeconds()}`;
  }

  toName() {
    if (this._hours == 0 && this._minutes == 0) {
      return "%d %s".format(this.seconds, _("seconds"));
    } else if (this._hours == 0) {
      if (this._seconds == 0) {
        return "%d %s".format(this.minutes, _("minutes"));
      }
      return "%dm%ds".format(this.minutes, this.seconds);
    }
    if (this.minutes == 0 && this.seconds == 0) {
      return "%d %s".format(this.hours, _("hours"));
    }
    return "%dh%dm%ds".format(this.hours, this.minutes, this.seconds);
  }

  toString(compact) {
    if (compact) {
      if (this._hours == 0 && this._minutes == 0) {
        return "%02ds".format(this._seconds);;
      } else if (this._hours == 0) {
        return "%02dm%02ds".format(this.minutes, this.seconds);
      }
      return "%02dh%02dm%02ds".format(this.hours, this.minutes, this.seconds);
    }
    return "%02d:%02d:%02d".format(this.hours, this.minutes, this.seconds);
  }
}

