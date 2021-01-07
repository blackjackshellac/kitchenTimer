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

  create_timer_item(timer, menu) {
      var timer_item = new PopupMenu.PopupMenuItem(timer.name);
      menu.addMenuItem(timer_item);
      //timer_item = this._addItem(timer.name, menu);

      timer_item._timer = timer;
      timer.label = new St.Label({ x_expand: true, x_align: St.Align.END });

      var bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
      bin.child = timer.label;
      timer_item.add(bin);

      var key = timer.degree_progress(15 /* 15 degree increments */);
      var icon = new St.Icon({
        gicon: this._indicator.progress_gicon(key),
        style_class: 'system-status-icon'
      });
      icon.set_icon_size(20);

      if (timer.is_running()) {
        icon.connect('button-press-event', (timer) => {
          timer.reset();
        });
      }
      timer_item.add(icon);
      timer_item.connect('activate', (ti) => {
        ti._timer.start();
      });

      timer.label_progress(new HMS(timer.duration));

      return timer_item;
  }

  build() {
    this.logger.info("Building the popup menu");

    this._menu.removeAll();
    this.timers.refresh();

    // this._addSwitch(_("Run Timer")).connect("toggled", () => {
      // this._stopTimer = !(this._stopTimer);
      // this.remove_actor(this._logo);
      // this.add_actor(this._box);
    //   this._refresh_timer();
    // });

    this._box = new St.BoxLayout();

    this._name = new St.Entry( {
      x_expand: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });
    this._name.set_hint_text(_("Label"));
    //this._name.set_can_focus(true);
    this._name.get_clutter_text().connect('text-changed', (e) => {
      this.logger.debug("label changed="+e.get_text());
    });
    this._he = new St.Entry( {
      text: "00",
      x_expand: true,
      x_align: St.Align.START,
      margin_right: 5,
      y_align: Clutter.ActorAlign.CENTER
    });
    //this._he.set_can_focus(true);

    this._me = new St.Entry( {
      text: "00",
      x_expand: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });
    this._se = new St.Entry( {
      text: "00",
      x_expand: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });

    this._go_hms = new HMS(0);
    this._he.get_clutter_text().connect('text-changed', (e) => {
      var text = e.get_text();
      this.logger.debug('text-changed hours: '+text);
      var num = this.time_number(text);
      if (num !== text) {
        this.logger.debug('entry update num='+num);
        e.set_text(num);
      }
    });

   this._me.get_clutter_text().connect('text-changed', (e) => {
      var text = e.get_text();
      this.logger.debug('text-changed minutes: '+text);
      var num = this.time_number(text);
      if (num !== text) {
        this.logger.debug('entry update num='+num);
        e.set_text(num);
      }
    });

   this._se.get_clutter_text().connect('text-changed', (e) => {
      var text = e.get_text();
      this.logger.debug('text-changed seconds: '+text);
      var num = this.time_number(text);
      if (num !== text) {
        this.logger.debug('entry update num='+num);
        e.set_text(num);
      }
    });

    this._he.get_clutter_text().connect('key-focus-out', (e) => {
      var text = e.get_text();
      this.logger.debug('key out hours: '+text);
      var num = this.validate_integer(text);
      if (num !== undefined) {
        this._go_hms.hours = num;
        this.logger.debug('hms='+this._go_hms.toString());
      }
      this._se.get_clutter_text().set_text(this._go_hms.s2s());
      this._me.get_clutter_text().set_text(this._go_hms.m2s());
      this._he.get_clutter_text().set_text(this._go_hms.h2s());
    });

    this._me.get_clutter_text().connect('key-focus-out', (e) => {
      var text = e.get_text();
      this.logger.debug('key out minutes: '+text);
      var num = this.validate_integer(text);
      if (num !== undefined) {
        this._go_hms.adjust_minutes(num);
        this.logger.debug('hms='+this._go_hms.toString());
      }
      this._se.get_clutter_text().set_text(this._go_hms.s2s());
      this._me.get_clutter_text().set_text(this._go_hms.m2s());
      this._he.get_clutter_text().set_text(this._go_hms.h2s());
    });

    this._se.get_clutter_text().connect('key-focus-out', (e) => {
      var text = e.get_text();
      this.logger.debug('key out seconds: '+text);
      var num = this.validate_integer(text);
      if (num !== undefined) {
        this._go_hms.adjust_seconds(num);
        this.logger.debug('hms='+this._go_hms.toString());
      }
      this._se.get_clutter_text().set_text(this._go_hms.s2s());
      this._me.get_clutter_text().set_text(this._go_hms.m2s());
      this._he.get_clutter_text().set_text(this._go_hms.h2s());
    });

    this._go = new PopupMenu.PopupSwitchMenuItem(_("Go"), false, {
      hover: false,
      style_class: null
    });

    this._box.add_child(this._name);
    this._box.add_child(this._he);
    this._box.add_child(this._me);
    this._box.add_child(this._se);
    this._box.add_child(this._go);

    var oneoff = new PopupMenu.PopupMenuItem("", { reactive: false } );
    oneoff.add(this._box);
    this._menu.addMenuItem(oneoff);

    this._go.connect('toggled', (go) => {
      if (go.state) {
        var name = this._name.get_clutter_text().get_text().trim();
        var s = this._se.get_clutter_text().get_text();
        var m = this._me.get_clutter_text().get_text();
        var h = this._he.get_clutter_text().get_text();
        var hms = HMS.create(h,m,s);
        if (name.length === 0) {
          name = hms.toString(true);
        }
        var timer = new Timer(name, hms.toSeconds());
        timer._quick = true;
        var tt = this.timers.add_check_dupes(timer);
        if (tt !== undefined) {
          tt.start();
          this._menu.close();
        } else {
          go.setToggleState(false);
        }
      }
    });

    var running_item = new PopupMenu.PopupMenuItem(_("Running timers"), { reactive: false } );
    this._menu.addMenuItem(running_item);

    this.timers.sort_by_remaining().forEach( (timer) => {
      var timer_item = this.create_timer_item(timer, this._menu);
    });

    this._addSeparator();

    this._quick_timer_menu = undefined;
    var timers=this.timers.sorted({running:false})
    timers.forEach( (timer) => {
      if (timer.quick && timer.enabled) {
        if (!this._quick_timer_menu) {
          // found quick timer, add the sub menu
          this._quick_timer_menu = this._addSubMenu(_("Quick timers"), this._menu);
        }
        this.create_timer_item(timer, this._quick_timer_menu.menu);
      }
    });

    this._presets_timer_menu = undefined;
    timers.forEach( (timer) => {
      if (!timer.quick && timer.enabled) {
        if (!this._presets_timer_menu) {
          // found presets, add the sub menu
          this._presets_timer_menu = this._addSubMenu(_("Preset timers"), this._menu);
        }
        this.create_timer_item(timer, this._presets_timer_menu.menu);
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
