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

const Utils = Me.imports.utils;
const Logger = Me.imports.logger.Logger;
const HMS = Me.imports.hms.HMS;

var AmPm = {
  H24: 0,
  AM: 1,
  PM: 2,
  RE: /p\.?m\.?/i
}

var logger = new Logger('kt alarm timer');

// var alarm_time={
//   hour: Number(g.h),
//   minute: 0,
//   second: 0,
//   ms: 0,
//   ampm: undefined|am|pm
// }
class AlarmTimer {
  constructor(debug=false) {
    logger.debugging = debug;

    this._name = "";
    this._hour = 0;
    this._minute = 0;
    this._second = 0;
    this._ms = 0;
    this._ampm = AmPm.H24;
  }

  get hour() { return this._hour; }

  set hour(h) {
    if (h === undefined) { return; }
    this._hour = Number(h);
    if (this.ampm == AmPm.PM) {
      this._hour += 12;
    }
    if (this._hour > 23) {
      logger.warn("AlarmTimer hour %d > 23", this._hour);
      this._hour = 23;
    }
  }

  get minute() { return this._minute; }

  set minute(m) {
    if (m === undefined) { return; }
    this._minute = Number(m);
    if (this._minute > 59) {
      logger.warn("AlarmTimer minute %d > 59", this._minute);
      this._minute = 59;
    }
  }

  get second() { return this._second; }

  set second(s) {
    if (s === undefined) { return; }
    this._second = Number(s);
    if (this._second > 59) {
      logger.warn("AlarmTimer second %d > 59", this._second);
      this._second = 59;
    }
  }

  get ms() { return this._ms; }
  set ms(msecs) {
    if (msecs === undefined) { return; }
    this._ms = Number(msecs);
    if (this._ms > 999) {
      logger.warn("AlarmTimer milliseconds > 999", this._ms);
      this._ms = 999;
    }
  }

  get ampm() { return this._ampm; }

  set ampm(val) {
    if (val === undefined) { return; }
    this._ampm = val;
  }

  get name() { return this._name; }

  set name(val) {
    if (val === undefined) { return; }
    this._name = val.trim();
  }

  static matchRegex(entry) {
    //var named_re = /^(?<name>[^@]+)?@\s*(?<h>\d+):?(?<m>\d+)?:?(?<s>\d+)?[.]?(?<ms>\d+)?\s*(?<ampm>a\.?m\.?|p\.?m\.?)?$/i;
    // name g1
    // hour g2
    // minute g3
    // second g4
    // ms g5
    // ampm g6
    var re= /^([^@]+)?@\s*(\d+):?(\d+)?:?(?<s>\d+)?[.]?(\d+)?\s*(a\.?m\.?|p\.?m\.?)?$/i;
    var m=re.exec(entry);
    if (!m) {
      return undefined;
    }

    var alarm_timer = new AlarmTimer();
    //alarm_timer.fromRegexNamedGroups(m.groups);
    alarm_timer.fromRegexMatches(m);
    return alarm_timer;
  }

  fromRegexMatches(m) {
    this.name = m[1];
    this.hour = m[2];
    this.minute = m[3];
    this.second = m[4];
    this.ms = m[5];
    if (m[6]) {
      this.ampm = m[6].match(AmPm.RE) ? AmPm.PM : AmPm.AM;
    }
  }

  fromRegexNamedGroups(g) {
    if (g.ampm) {
      this.ampm = g.ampm.match(AmPm.RE) ? AmPm.PM : AmPm.AM;
    }
    this.name = g.name;
    this.hour = g.h;
    this.minute = g.m;
    this.second = g.s;
    this.ms = g.ms;
  }

  hms() {
    var now=new Date();
    var alarm_date=new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      this.hour,
      this.minute,
      this.second,
      this.ms
    );

    var duration_ms = alarm_date.getTime() - now.getTime();
    if (duration_ms < 0) {
      duration_ms += 86400000;
    }
    var hms = new HMS(duration_ms/1000);
    return hms;
  }
}
