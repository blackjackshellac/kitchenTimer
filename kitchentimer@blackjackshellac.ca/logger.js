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

String.prototype.format = imports.format.format;

class Logger {
    constructor(logid=undefined, debug=false) {
        this._logid = logid === undefined ? LOGID : logid;
        this._debug_enabled = debug;
    }

    _log(level, format, ...args) {
      var msg = (Array.isArray(args) && args.length > 0) ? format.format(...args) : format;
      log(`${level}: [${this._logid}] ${msg}`);
    }

    debug(format, ...args) {
     if (!this._debug_enabled) return;
      this._log("DEBUG", format, ...args);
    }

    warn(format, ...args) {
      this._log("WARNING", format, ...args);
    }

    info(format, ...args) {
      this._log("INFO", format, ...args);
    }

    error(format, ...args) {
      this._log("ERROR", format, ...args);
    }
}

