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

const LOGID = 'logger';

class Logger {
    constructor(logid=undefined, debug=false) {
        this._logid = logid === undefined ? LOGID : logid;
        this._debug_enabled = debug;
    }

    _log(level,message) {
      log(`${level}: [${this._logid}] ${message}`);
    }

    debug(message) {
      if (!this._debug_enabled) return;
      this._log("DEBUG", message);
    }

    warn(message) {
      this._log("WARNING", message);
    }

    info(message) {
      this._log("INFO", message);
    }

    error(message) {
      this._log("ERROR", message);
    }
}

