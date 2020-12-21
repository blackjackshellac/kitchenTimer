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

const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;

class PanelMenuBuilder {
  constructor(menu, settings, timers=null) {
    log("");
    this._menu = menu;
    this._settings = settings;

    // let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
    // item.connect('activate', () => {
    //   Main.notify(_('Whatʼs up, folks?'));
    // });
    // this._menu.addMenuItem(item);
  }

  build() {
    this._addSwitch(_("Run Timer")).connect("toggled", () => {
      // this._stopTimer = !(this._stopTimer);
      // this.remove_actor(this._logo);
      // this.add_actor(this._box);
      this._refresh_timer();
    });

    this._presets = this._addSubMenu(_("Presets"), this._menu);

    this._addItem(_('Show Notification')).connect('activate', () => {
      Main.notify(_('Notification test'))
    });

    this._addItem(_('Reset timer …')).connect('activate', () => {
      this._reset_timer();
    });
  }

  _addSubMenu(text, parent) {
    let popup = new PopupMenu.PopupSubMenuMenuItem(text);
    parent.addMenuItem(popup);
    return popup;
  }

  _addItem(text) {
    log("adding text="+text);
    let item = new PopupMenu.PopupMenuItem(text)
    this._menu.addMenuItem(item);
    return item;
  }

  _addSwitch(text, on=false) {
    let item = new PopupMenu.PopupSwitchMenuItem(text, on);
    this._menu.addMenuItem(item);
    return item;
  }

  _reset_timer() {
    log("_reset_timer");
  }

  _run_timer() {
    log("_run_timer");
  }

}
