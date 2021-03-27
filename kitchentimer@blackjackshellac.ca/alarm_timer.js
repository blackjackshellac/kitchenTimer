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
  RE: /(p\.?m\.?)|(a\.?m\.?)/i
}

var logger = new Logger('kt alarm timer');

// var alarm_time={
//   hour: Number(g.h),
//   minute: 0,
//   second: 0,
//   ms: 0,
//   ampm: undefined|am|pm
// }

var AlarmTimer = class AlarmTimer {
  constructor() {
    this._name = "";
    this._hour = 0;
    this._minute = 0;
    this._second = 0;
    this._ms = 0;
    this._ampm = AmPm.H24;
    this._snooze_ms = 0;
    this._alarm_date = undefined;
  }

  set debug(settings) {
    logger.settings = settings;
  }

  get hour() { return this._hour; }

  set hour(h) {
    if (h === undefined) { return; }
    this._hour = Number(h);
    if (this.ampm == AmPm.PM) {
      // 12pm is 12h00 (noon)
      //  1pm is 13h00
      if (this._hour < 12) {
        this._hour += 12;
      } else if (this._hour > 12) {
        throw 'PM hour is greater than 12 (noon)';
      }
    } else if (this.ampm == AmPm.AM) {
      // 12am is 0h00 (midnight)
      if (this._hour == 12) {
        this._hour = 0;
      } else if (this._hour > 12) {
        throw 'AM hour is greater than 12 (midnight)';
      }
    }
    this.ampm = AmPm.H24;
    if (this._hour > 23) {
      throw 'hour is greater than 23: '+this._hour;
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
    //         name?  @    HH  :? MM?  :? SS?  .?  ms?       (a.?m.?|p.?m.?)?
    var re= /^([^@]+)?@\s*(\d+)[:h]?(\d+)?[m:]?(\d+)?[.]?(\d+)?\s*(a\.?m\.?|p\.?m\.?)?$/i;
    let m=re.exec(entry);
    if (!m) {
      return undefined;
    }

    var alarm_timer = new AlarmTimer();

    try {
      //alarm_timer.fromRegexNamedGroups(m.groups);
      alarm_timer.fromRegexMatches(m);
      alarm_timer.alarm_date;
    } catch (e) {
      logger.error("%s: %s", e, entry);
      return undefined;
    }
    return alarm_timer;
  }

  matchAmPm(ampm) {
    let m = AmPm.RE.exec(ampm);
    if (m) {
      if (m[1]) {
        return AmPm.PM;
      }
      if (m[2]) {
        return AmPm.AM;
      }
    }
    throw 'Invalid AM PM spec: '+ampm;
  }

  fromRegexMatches(m) {
    logger.debug("match = %s", JSON.stringify(m));
    if (m[6]) {
      this.ampm = this.matchAmPm(m[6]);
    }
    this.name = m[1] === null ? m[0] : m[1];
    this.hour = m[2];
    this.minute = m[3];
    this.second = m[4];
    this.ms = m[5];
  }

  fromRegexNamedGroups(g) {
    if (g.ampm) {
      this.ampm = this.matchAmPm(g.ampm);
    }
    this.name = g.name;
    this.hour = g.h;
    this.minute = g.m;
    this.second = g.s;
    this.ms = g.ms;
  }

  toString() {
    return "%02d:%02d:%02d.%03d".format(this.hour, this.minute, this.second, this.ms);
  }

  toCompact() {
    if (this.second == 0) {
      return "%d:%02d".format(this.hour, this.minute);
    }
    return "%d:%02d:%02d".format(this.hour, this.minute, this.second);
  }

  name_at_hms() {
    return "%s@%s".format(this.name, this.toCompact());
  }

  get alarm_date() {
    if (this._alarm_date === undefined) {
      let now=new Date();
      this._alarm_date=new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        this.hour,
        this.minute,
        this.second,
        this.ms
      );
      let duration_ms = this._alarm_date.getTime() - now.getTime();
      if (duration_ms < 0) {
        // must be for tomorrow
        this._alarm_date.setDate(this._alarm_date.getDate()+1);
      }
    }
    return this._alarm_date;
  }

  hms() {
    let now=new Date();
    let duration_ms = this.end() - now.getTime();
    return new HMS(duration_ms/1000);
  }

  snooze(secs) {
    this._snooze_ms += secs * 1000;
  }

  end() {
    //logger.debug("end time=%d snooze=%d", this.alarm_date.getTime(), this._snooze_ms);
    return this.alarm_date.getTime() + this._snooze_ms;
  }

  reset() {
    this._alarm_date = undefined;
    this._snooze_ms = 0;
  }

  // this._name = "";
  // this._hour = 0;
  // this._minute = 0;
  // this._second = 0;
  // this._ms = 0;
  // this._ampm = AmPm.H24;
  // this._snooze_ms = 0;
  // this._alarm_date = undefined;
  save() {
    return {
      name: this._name,
      alarm_date: this.alarm_date.getTime(),
      ampm: this._ampm,
      snooze_ms: this._snooze_ms
    }
  }

  static restore(state) {
    if (state === undefined) {
      return undefined;
    }
    let at = new AlarmTimer();

    at._name = state.name;

    at._alarm_date = new Date(state.alarm_date);
    at._hour = at._alarm_date.getHours();
    at._minute = at._alarm_date.getMinutes();
    at._second = at._alarm_date.getSeconds();
    at._ms = at._alarm_date.getMilliseconds();

    at._ampm = state.ampm;
    at._snooze_ms = state.snooze_ms;

    return at;
  }

  forward(end, delta) {
    logger.debug("alarm timer end=%d (delta=%d)", end, delta);
    this.alarm_date.setTime(this.alarm_date.getTime()+delta*1000);
    this._hour = this.alarm_date.getHours();
    this._minute = this.alarm_date.getMinutes();
    this._second = this.alarm_date.getSeconds();
    return this.end();
  }

  backward(end, delta) {
    return this.forward(end, -delta);
  }
};

