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

class Timers extends Array {
  constructor(...args) {
    super(...args);
  }

}

const TimerState = {
  STOPPED: 0,
  STARTED: 1,
  ENDED: 2
}

class Timer {

  constructor(name, duration) {
    this._name = name;
    this._duration = duration;
    this._state = TimerState.STOPPED;
  }

  isEmpty() {
    this.length === 0;
  }

}
