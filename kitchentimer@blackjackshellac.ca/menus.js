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

class PanelMenuBuilder {
  constructor(menu, indicator) {
    log("");
    this._menu = menu;
    this._indicator = indicator;
    this._create_timer_menu = undefined;
    this._settings = indicator.settings;
    this._timers = indicator.timers;

    this.logger = new Logger('kt menu', indicator.settings.debug);

    this._menu.connect('open-state-changed', (self,open) => {
      if (open) {
        this.build();
      } else {
        this.timers.forEach( (timer) => {
          timer.label = null;
        });
      }
    });
  }

  get timers() {
    return this._indicator.timers;
  }

  create_icon() {
    var icon = new St.Icon({
            gicon: this._indicator.progress_gicon(0),
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
    this.logger.info("Building the popup menu");

    this._menu.removeAll();
    this.timers.refresh();

    new Mitem.KitchenTimerQuickItem(this._menu, this.timers);

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

    this._quick_timer_menu = undefined;
    var quick_timers_label = _("Quick timers");
    var timers=this.timers.sorted({running:false})
    timers.forEach( (timer) => {
      if (timer.quick && timer.enabled) {
        if (this._quick_timer_menu === undefined) {
          // found quick timer, add the sub menu if running timers
          if (running_item === undefined) {
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
          if (running_item === undefined && this._quick_timer_menu === undefined) {
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

    this._create_timer_menu = this._addSubMenu(_("Create Timer"), this._menu);
    this._buildCreateTimerMenu();

    this._addSeparator();
    var prefs = this._addItem(_("Preferences…"));
    prefs.connect('activate', () => {
      ExtensionUtils.openPrefs();
    });
  }

  // Add sliders SubMenu to manually set the timer
  _buildCreateTimerMenu() {

    var hms = new HMS(this._settings.default_timer);

    this._hoursLabel = new St.Label({ text: hms.hours.toString() + "h" });
    this._minutesLabel = new St.Label({ text: hms.minutes.toString() + "m" });
    this._secondsLabel = new St.Label({ text: hms.seconds.toString() + "s" });

    // Hours
    var item = new PopupMenu.PopupMenuItem(_("Hours"), { reactive: false });

    var bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
    bin.child = this._hoursLabel;
    item.add(bin);

    this._create_timer_menu.menu.addMenuItem(item);

    item = new PopupMenu.PopupBaseMenuItem({ activate: false });
    this._hoursSlider = new Slider.Slider(0, {x_expand: true, y_expand:true});
    this._hoursSlider._value = hms.hours / 23;
    this._hoursSlider.connect('notify::value', () => {
      hms.hours = Math.ceil(this._hoursSlider._value*23);
      this._hoursLabel.set_text(hms.hours.toString() + "h");
    });

    item.add(this._hoursSlider);

    this._create_timer_menu.menu.addMenuItem(item);

    // Minutes
    item = new PopupMenu.PopupMenuItem(_("Minutes"), { reactive: false });
    bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
    bin.child = this._minutesLabel;
    item.add(bin);

    this._create_timer_menu.menu.addMenuItem(item);

    item = new PopupMenu.PopupBaseMenuItem({ activate: false });
    this._minutesSlider = new Slider.Slider(0, { x_expand: true });
    this._minutesSlider._value = hms.minutes / 59;
    this._minutesSlider.connect('notify::value', () => {
      hms.minutes = Math.ceil(this._minutesSlider._value*59);
      this._minutesLabel.set_text(hms.minutes.toString() + "m");
    });
    item.add(this._minutesSlider);
    this._create_timer_menu.menu.addMenuItem(item);

    // Seconds
    item = new PopupMenu.PopupMenuItem(_("Seconds"), { reactive: false });

    bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
    bin.child = this._secondsLabel;
    item.add(bin);
    this._create_timer_menu.menu.addMenuItem(item);

    item = new PopupMenu.PopupBaseMenuItem({ activate: false });
    this._secondsSlider = new Slider.Slider(0, { expand: true });
    this._secondsSlider._value = hms.seconds / 59;
    this._secondsSlider.connect('notify::value', () => {
      hms.seconds = Math.ceil(this._secondsSlider._value*59);
      this._secondsLabel.set_text(hms.seconds.toString() + "s");
    });
    item.add(this._secondsSlider);
    this._create_timer_menu.menu.addMenuItem(item);

    item = new PopupMenu.PopupMenuItem(_("Name"), { reactive: false } );
    this._create_timer_menu.menu.addMenuItem(item);

    this._name_entry = new St.Entry();
    this._name_entry.hint_text = _('Name for timer');
    this._name_entry.set_primary_icon(this.create_icon());
    item = new PopupMenu.PopupMenuItem("", { reactive: false } );
    bin = new St.Bin({ x_expand: true, x_align: St.Align.START });
    bin.child = this._name_entry;
    item.add(bin);
    this._create_timer_menu.menu.addMenuItem(item);

    this._addSwitch(_("Create"), false, this._create_timer_menu.menu).connect('toggled', (create_switch) => {
      var name = this._name_entry.get_text();
      var timer = new Timer(name, hms.toSeconds());
      this.timers.add_check_dupes(timer);
    });
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

  // TODO figure out how to reset timer
  _reset_timer() {
    this.logger.info("_reset_timer");
  }

  _run_timer() {
    this.logger.info("_run_timer");
  }

}
