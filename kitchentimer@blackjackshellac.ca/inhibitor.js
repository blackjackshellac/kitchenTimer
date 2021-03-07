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

const { Gio, Gtk, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Logger = Me.imports.logger.Logger;

const DBusSessionManagerIface = `
<node>
  <interface name="org.gnome.SessionManager">
    <method name="Inhibit">
        <arg type="s" direction="in" />
        <arg type="u" direction="in" />
        <arg type="s" direction="in" />
        <arg type="u" direction="in" />
        <arg type="u" direction="out" />
    </method>
    <method name="Uninhibit">
        <arg type="u" direction="in" />
    </method>
       <method name="GetInhibitors">
           <arg type="ao" direction="out" />
       </method>
    <signal name="InhibitorAdded">
        <arg type="o" direction="out" />
    </signal>
    <signal name="InhibitorRemoved">
        <arg type="o" direction="out" />
    </signal>
  </interface>
</node>
`.trim();

const DBusSessionManagerProxy = Gio.DBusProxy.makeProxyWrapper(DBusSessionManagerIface);

// const DBusSessionManagerInhibitorIface = `<node>
//   <interface name="org.gnome.SessionManager.Inhibitor">
//     <method name="GetAppId">
//         <arg type="s" direction="out" />
//     </method>
//   </interface>
// </node>
// `.trim();

var SessionManagerInhibitor = class SessionManagerInhibitor {
  constructor(settings) {
    this.logger = new Logger('kt-inhibitor', settings);
    this._sessionManager = new DBusSessionManagerProxy(Gio.DBus.session,
                                                       'org.gnome.SessionManager',
                                                       '/org/gnome/SessionManager');
    this._cookies = {};

    this._settings = settings;
  }

  get_cookie(app_id) {
    return this._cookies[app_id];
  }

  inhibit_timer(timer) {
    let inhibit_max = this.settings.inhibit_max;
    if (inhibit_max == 0 || timer.remaining_secs < inhibit_max) {
      return this.inhibit(timer.id, "Inhibit %s".format(timer.name));
    }
    //this.logger.debug("Don't inhibit %d < %d", timer.remaining_secs, inhibit_max);
    return false;
  }

  /*
    The flags parameter must include at least one of the following:

    1: Inhibit logging out
    2: Inhibit user switching
    4: Inhibit suspending the session or computer
    8: Inhibit the session being marked as idle
  */
  inhibit(app_id, reason) {
    let cookie = this.get_cookie(app_id);
    if (cookie) {
      // app_id already inhibited
      return cookie;
    }
    let flags = this.settings.inhibit;
    if (flags <= 0) {
      this.uninhibit(app_id);
      return false;
    }
    this._sessionManager.InhibitRemote(app_id,
      0, reason, flags,
      cookie => {
        this.logger.debug("Inhibit id=%s [%s]: cookie=%d", app_id, reason, cookie);
        this._cookies[app_id] = cookie;
      }
    );
    return this.get_cookie(app_id);
  }

  uninhibit(app_id) {
    let cookie = this.get_cookie(app_id);
    if (cookie) {
      this.logger.debug("Uninhibit id=%s: cookie=%d", app_id, cookie);
      this._sessionManager.UninhibitRemote(cookie);
      return delete this._cookies[app_id];
    }
    this.logger.debug("No cookie found for app_id=%s (already uninhibited)", app_id);
    return false;
  }

  get settings() {
    return this._settings;
  }

  set settings(val) {
    this._settings = val;
  }

};

