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

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const { St, Clutter } = imports.gi;

const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Slider = imports.ui.slider;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Timer = Me.imports.timers.Timer;
const Utils = Me.imports.utils;
const Logger = Me.imports.logger.Logger;
const HMS = Me.imports.hms.HMS;
const Mitem = Me.imports.menuitem;

var PanelMenuBuilder = class PanelMenuBuilder {
  constructor(menu, timers) {
    this._menu = menu;
    this._create_timer_menu = undefined;
    this._timers = timers;

    this.logger = new Logger('kt menu', timers.settings);

    this._menu.connect('open-state-changed', (self,open) => {
      if (open) {
        this.build();
        this._quick.grab_key_focus();
      } else {
        this.timers.forEach( (timer) => {
          timer.label = null;
        });
      }
    });
  }

  get timers() {
    return this._timers;
  }

  create_icon() {
    var icon = new St.Icon({
            gicon: this._timers.progress_gicon(0),
            style_class: 'system-status-icon',
        });
    icon.set_icon_size(16);
    return icon;
  }

  validate_integer(text, min=0) {
    if (text.length == 0) {
      return min;
    }
    var re_nan=/[^0-9]/
    if (re_nan.test(text)) {
      // contains non digits
      return undefined;
    }
    return parseInt(text, 10);
  }

  time_number(text) {
    var tlen = text.length;
    if (tlen > 2) {
      // strip off leading zero
      return text.replace(/^0/, "");
    }
    if (tlen == 1) {
      return "0"+text;
    }
    return text;
  }

  build() {
    this.logger.debug("Building the popup menu");

    this._menu.removeAll();
    this.timers.refresh();

    this._quick = new Mitem.KitchenTimerQuickItem(this._menu, this.timers);

    var running_item;

    this.timers.sort_by_running().forEach( (timer) => {
      if (running_item === undefined) {
        running_item = new PopupMenu.PopupMenuItem(_("Running timers"), { reactive: false } );
        this._menu.addMenuItem(running_item);
      }
      var timer_item = new Mitem.KitchenTimerMenuItem(timer, this._menu);
    });

    if (running_item !== undefined) {
      this._addSeparator();
    }

    let prefer_presets = (this.timers.prefer_presets > 0);

    this._quick_timer_menu = undefined;
    var quick_timers_label = _("Quick timers");
    var timers=this.timers.sorted({running:false})
    timers.forEach( (timer) => {
      if (timer.quick && timer.enabled) {
        if (this._quick_timer_menu === undefined) {
          // found quick timer, add the sub menu if running timers
          if (!prefer_presets) {
            var quick_item = new PopupMenu.PopupMenuItem(quick_timers_label, { reactive: false } );
            this._menu.addMenuItem(quick_item);
            this._quick_timer_menu = this._menu;
          } else {
            this._quick_timer_menu = this._addSubMenu(quick_timers_label, this._menu).menu;
          }
        }
        new Mitem.KitchenTimerMenuItem(timer, this._quick_timer_menu);
      }
    });

    if (this.running_item !== undefined || this._quick_timer_menu !== undefined) {
      this._addSeparator();
    }

    this._presets_timer_menu = undefined;

    var preset_timers_label = _("Preset timers");
    timers.forEach( (timer) => {
      if (!timer.quick && timer.enabled) {
        if (this._presets_timer_menu === undefined) {
          // found presets, add the sub menu if quick timers
          if (prefer_presets || this._quick_timer_menu === undefined) {
            var presets_item = new PopupMenu.PopupMenuItem(preset_timers_label, { reactive: false } );
            this._menu.addMenuItem(presets_item);
            this._presets_timer_menu = this._menu;
          } else {
            this._presets_timer_menu = this._addSubMenu(preset_timers_label, this._menu).menu;
          }
        }
        new Mitem.KitchenTimerMenuItem(timer, this._presets_timer_menu);
      }
    });

    this._addSeparator();

    new Mitem.KitchenTimerCreatePreset(this._menu, this.timers);
  }

  _getMenu(menu) {
    return menu === undefined ? this._menu : menu;
  }

  // this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  _addSeparator(menu=undefined) {
    this._getMenu(menu).addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  }

  _addSubMenu(text, menu=undefined) {
    menu=this._getMenu(menu);
    var popup = new PopupMenu.PopupSubMenuMenuItem(text);
    menu.addMenuItem(popup);
    return popup;
  }

  _addItem(text, menu=undefined) {
    menu=this._getMenu(menu);
    //this.logger.debug("adding "+text);
    var item = new PopupMenu.PopupMenuItem(text)
    menu.addMenuItem(item);
    return item;
  }

  _addSwitch(text, on=false, menu=undefined) {
    menu=this._getMenu(menu);
    var item = new PopupMenu.PopupSwitchMenuItem(text, on);
    menu.addMenuItem(item);
    return item;
  }
}
