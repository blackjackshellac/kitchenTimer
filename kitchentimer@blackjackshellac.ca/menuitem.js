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

const { Clutter, GObject, St, Gio } = imports.gi;

const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Timer = Me.imports.timers.Timer;
const AlarmTimer = Me.imports.timers.AlarmTimer;
const Utils = Me.imports.utils;
const HMS = Me.imports.hms.HMS;
const Logger = Me.imports.logger.Logger;

var KTTypes = {
  "stop": 'media-playback-stop-symbolic',
  "delete" : 'edit-delete-symbolic'
}

var logger = new Logger('kt menuitem');

var KitchenTimerCreatePreset = GObject.registerClass(
class KitchenTimerCreatePreset extends PopupMenu.PopupSubMenuMenuItem {
  _init(menu, timers) {
    super._init(_("Create Preset"));
    this._timers = timers;
    menu.addMenuItem(this);

    this._entry = new St.Entry( {
      x_expand: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });
    this._entry.set_hint_text(_("Name 00:00:00"));
    this._entry.get_clutter_text().set_activatable(true);
    this._entry.set_primary_icon(KitchenTimerCreatePreset.create_icon(this._timers.indicator));

    var name_item = new PopupMenu.PopupMenuItem("", { reactive: false } );
    var bin = new St.Bin({ x_expand: true, x_align: St.Align.START });
    bin.child = this._entry;
    name_item.add(bin);
    this.menu.addMenuItem(name_item);

    this._name = "";

    this._hslider = new KitchenTimerTimeSliderItem(this, "h", 0, 99);
    this._mslider = new KitchenTimerTimeSliderItem(this, "m", 0, 59);
    this._sslider = new KitchenTimerTimeSliderItem(this, "s", 0, 59);

    this._go = new PopupMenu.PopupImageMenuItem(_("Create"), this._timers.indicator.progress_gicon(0));
    this._go.label.set_y_align( Clutter.ActorAlign.CENTER );
-   this._go.label.set_y_expand(true);

    bin = new St.Bin({ x_expand: true, x_align: St.Align.START });
    this._time = new St.Label( { text: "00:00:00", style_class: 'popup-menu-item', x_expand: true, x_align: St.Align.START });
    bin.child = this._time;
    this._go.add(bin);

    this.menu.addMenuItem(this._go);

    this._go.connect('activate', (go) => {
      this.activate_go();
    });

    this._entry.get_clutter_text().connect('activate', (e) => {
      this.activate_go();
    });

    this._entry.get_clutter_text().connect('key-focus-out', (e) => {
      var entry = e.get_text();
      logger.debug('key out hours: '+entry);
      var result = KitchenTimerMenuItem.parseTimerEntry(entry, false);
      if (result) {
        this._name = result.name;
        if (result.has_time) {
          this._hslider.value = result.hms.hours;
          this._mslider.value = result.hms.minutes;
          this._sslider.value = result.hms.seconds;

          this.update_time();
        }
        //Utils.logObjectPretty(result);
      }
    });

  }

  activate_go() {
    var ctext = this._entry.get_clutter_text();
    var entry = ctext.get_text();
    logger.debug('activate: '+entry);
    var result = KitchenTimerMenuItem.parseTimerEntry(entry, false);
    if (result) {
      ctext.set_text("%s %s".format(result.name, result.hms.toString()));
      var timer = KitchenTimerMenuItem.addTimerStart(result, this._timers);
      if (timer === undefined) {
      } else {
        this.menu.close();
      }
    }
  }

  static create_icon(indicator) {
    var icon = new St.Icon({
            gicon: indicator.progress_gicon(0),
            style_class: 'system-status-icon',
        });
    icon.set_icon_size(16);
    return icon;
  }

  update_time() {
    var text="%s %02d:%02d:%02d".format(this._name, this._hslider.value, this._mslider.value, this._sslider.value);
    this._time.set_text(text);
    this._entry.get_clutter_text().set_text(text);
  }

});

    // this._hoursLabel = new St.Label({ text: hms.hours.toString() + "h" });
    // this._minutesLabel = new St.Label({ text: hms.minutes.toString() + "m" });
    // this._secondsLabel = new St.Label({ text: hms.seconds.toString() + "s" });

    // Hours
    // var item = new PopupMenu.PopupMenuItem(_("Hours"), { reactive: false });

    // var bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
    // bin.child = this._hoursLabel;
    // item.add(bin);

    // this._create_timer_menu.menu.addMenuItem(item);

    // item = new PopupMenu.PopupBaseMenuItem({ activate: false });
    // this._hoursSlider = new Slider.Slider(0, {x_expand: true, y_expand:true});
    // this._hoursSlider._value = hms.hours / 23;
    // this._hoursSlider.connect('notify::value', () => {
    //   hms.hours = Math.ceil(this._hoursSlider._value*23);
    //   this._hoursLabel.set_text(hms.hours.toString() + "h");
    // });

    // item.add(this._hoursSlider);

var KitchenTimerTimeSliderItem = GObject.registerClass(
class KitchenTimerTimeSliderItem extends PopupMenu.PopupMenuItem {
  _init(parent, suffix, min, max) {
    super._init("", { reactive: true });
    parent.menu.addMenuItem(this);

    this._parent = parent;
    this._suffix = suffix;
    this._value = min;
    this._min = min;
    this._max = max;
    this._label = new St.Label({ text: this.format(min), style_class: 'kitchentimer-panel-label' });

    var bin = new St.Bin({ x_expand: false, x_align: St.Align.START });
    bin.child = this._label;
    this.add(bin);

    this._slider = new Slider.Slider(min, {x_expand: true, y_expand:true});
    this._slider._value = min;
    this._slider.connect('notify::value', (slider) => {
      this._value = Math.ceil(slider._value * this._max);
      // value goes from min to max, slider.value is 0 to 1
      // (this._value-min)/max;
      slider.value = (this._value-this._min)/this._max;
      this._label.set_text(this.format(this._value));
      this._parent.update_time();
    });

    this.add(this._slider);
  }

  format(val) {
    return "%02d%s".format(val, this._suffix);
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._slider.value = (val-this._min)/this._max;
  }
});

var KitchenTimerMenuItem = GObject.registerClass(
class KitchenTimerMenuItem extends PopupMenu.PopupMenuItem {
  _init(timer, menu) {
      super._init("", { reactive: true });

      this._timer = timer;

      logger.debugging = timer.timers.settings.debug;

      var box = new St.BoxLayout({
        x_expand: true,
        x_align: St.Align.START,
        pack_start: true,
        style_class: 'kitchentimer-menu-box'
      });
      this.add(box);

      var name = new St.Label({
        style_class: 'kitchentimer-menu-name',
        x_expand: true,
        x_align: St.Align.START
      });
      name.set_text(timer.name);

      timer.label = new St.Label({
        style_class: 'kitchentimer-menu-label',
        x_expand: false,
        x_align: St.Align.END
      });

      var key = timer.degree_progress(15 /* 15 degree increments */);
      var timer_icon = new St.Icon({
        x_align: St.Align.END,
        x_expand: false,
        gicon: timer.timers.indicator.progress_gicon(key),
        style_class: 'kitchentimer-menu-icon'
      });
      timer_icon.set_icon_size(20);

      var control_button;
      if (timer.running) {
        control_button = new KitchenTimerControlButton(timer, "stop");
        control_button.connect('clicked', (cb) => {
          cb.stop();
          //menu.close();
          this._timer.timers.indicator.rebuild_menu();
        });
      } else {
        control_button = new KitchenTimerControlButton(timer, "delete");
        control_button.connect('clicked', (cb) => {
          cb.delete();
          this._timer.timers.indicator.rebuild_menu();
        });

      }

      if (control_button) {
        //logger.debug("Adding control icon button");
        box.add_child(control_button);
      }

      box.add_child(timer.label);
      box.add_child(timer_icon);
      box.add_child(name);

      this.connect('activate', (tmi) => {
        if (!tmi._timer.running) {
          tmi._timer.start();
        }
      });

      var hms = timer.alarm_timer ? timer.alarm_timer.hms() : new HMS(timer.duration);
      timer.label_progress(hms);

      menu.addMenuItem(this);
  }

  get timer() {
    return this._timer;
  }

  static addTimerStart(result, timers) {
    if (timers === undefined) {
      logger.error('timers not specified');
      return undefined;
    }
    if (result === undefined) {
      return undefined;
    }
    if (!result.has_time) {
      return undefined;
    }
    var timer = new Timer(result.name, result.hms.toSeconds());
    timer.quick = result.quick;
    timer.alarm_timer = result.alarm_timer;
    var tt = timers.add_check_dupes(timer);
    if (tt !== undefined) {
      logger.debug("starting timer: %s", timer.name);
      tt.start();
    }
    return tt;
  }

  // alarm @3:55pm
  // alarm @15:55:00.000
  // alarm @3pm
  static re_alarm(parse) {
    var alarm_timer = AlarmTimer.matchRegex(parse.entry);
    if (alarm_timer === undefined) {
      return false;
    }

    parse.name=parse.entry;
    parse.alarm_timer = alarm_timer;
    parse.hms = parse.alarm_timer.hms();
    parse.hours = parse.hms.hours;
    parse.minutes = parse.hms.minutes;
    parse.seconds = parse.hms.seconds;
    parse.has_time = true;

    return true;

    //e=new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHour(), d.getMinute(), d.getSeconds(), d.getMilliseconds())

    // var alarm_time={
    //   hour: Number(g.h),
    //   minute: 0,
    //   second: 0,
    //   ms: 0,
    //   ampm: g.ampm !== undefined
    // }
    // Utils.logObjectPretty(alarm_time);
    // if (alarm_time.ampm) {
    //   if (g.ampm.match(/p\.?m\.?/i)) {
    //     alarm_time.hour += 12;
    //     if (alarm_time.hour > 24) {
    //       logger.warn("hour is greater than 24: %s h=%d", parse.entry, alarm_time.hour);
    //     }
    //   }
    // }
    // if (g.m) {
    //   alarm_time.minute = Number(g.m);
    //   if (alarm_time.minute > 59) {
    //     logger.warn("minute is greater than 59");
    //     alarm_time.minute = 59;
    //   }
    // }
    // if (g.s) {
    //   alarm_time.second = Number(g.s);
    //   if (alarm_time.second > 59) {
    //     logger.warn("second is greater than 59");
    //     alarm_time.second = 59;
    //   }
    // }
    // if (g.ms) {
    //   alarm_time.ms=Number(g.ms);
    //   if (alarm_time.ms > 1000) {
    //     logger.warn("ms is greater than 999");
    //     alarm_time.ms = 999;
    //   }
    // }

    // var now=new Date();
    // var alarm_date=new Date(
    //   now.getFullYear(),
    //   now.getMonth(),
    //   now.getDate(),
    //   alarm_time.hour,
    //   alarm_time.minute,
    //   alarm_time.second,
    //   alarm_time.ms
    // );
    // var duration_ms = alarm_date.getTime() - now.getTime();
    // if (duration_ms < 0) {
    //   duration_ms += 86400000;
    // }
    // parse.hms = new HMS(duration_ms/1000);
    // parse.hours = parse.hms.hours;
    // parse.minutes = parse.hms.minutes;
    // parse.seconds = parse.hms.seconds;
    // parse.has_time = true;

    // return true;
  }

  // hms, ms or s
  static re_hms(parse) {
    // t1 = m[1], t2 = m[2], t3 = m[3]
    //var re = /^((?<t1>\d+):)?((?<t2>\d+):)?(?<t3>\d+)$/;

    // m0 "0:0:120",
    // m1 "0:",
    // h m2 "0",
    // m3 "0:",
    // m m4 "0",
    // s m5 "120"

    var re = /^((\d+):)?((\d+):)?(\d+)$/;
    var m = re.exec(parse.entry);
    if (m) {
      logger.debug("matched in re_hms");
      //var g=m.groups;
      Utils.logObjectPretty(m);
      parse.has_time = true;
      if (m[2] && m[4] && m[5]) {
        parse.hours=m[2];
        parse.minutes=m[4];
        parse.seconds=m[5];
      } else if (m[2] && m[5]) {
        parse.minutes=m[2];
        parse.seconds=m[5];
      } else if (m[5]) {
        parse.seconds=m[5];
      } else {
        parse.has_time = false;
      }
      return true;
    }
    return false;
  }

  // well formed, name HH:MM:SS
  static re_name_hms(parse) {
    //var re = /^(?<name>.*?)\s+(?<t1>\d+):(?<t2>[\d]+):(?<t3>\d+)$/;
    var re = /^(.*?)\s+(\d+):(\d+):(\d+)$/;
    var m = re.exec(parse.entry);
    if (m) {
      logger.debug("matched in re_name_hms");
      //var g=m.groups;
      //Utils.logObjectPretty(g);

      parse.name = m[1];
      parse.hours = m[2];
      parse.minutes = m[3];
      parse.seconds = m[4];
      parse.has_time = true;
      return true;
    }
    return false;
  }

  // name? HH:MM:SS
  // name? MM:SS
  // name? SS
  // name
  static re_wildcard(parse) {
    //var re = /(?<name>([^\s]+\s)*?)?(?<t1>\d+)?\s*:?\s*(?<t2>[\d]+)?\s*:?\s*(?<t3>\d+)?$/;
    var re = /(([^\s]+\s)*?)?(\d+)?\s*:?\s*([\d]+)?\s*:?\s*(\d+)?$/;
    var m=re.exec(parse.entry+' ');
    if (m) {
      //var g=m.groups;
      // if (g.name) {
      //   parse.name=g.name.trim();
      // }
      // parse.has_time = true;
      // if (g.t3 && g.t2 && g.t1) {
      //   parse.hours=g.t1;
      //   parse.minutes=g.t2;
      //   parse.seconds=g.t3;
      // } else if (g.t2 && g.t1) {
      //   parse.minutes=g.t1;
      //   parse.seconds=g.t2;
      // } else if (g.t1) {
      //   parse.seconds=g.t1;
      // } else {
      //   parse.has_time = false;
      // }

      if (m[1]) {
        parse.name = m[1];
      }
      parse.has_time = true;
      if (m[1] && m[3] && m[4] && m[5]) {
        // gjs> m=re.exec("name of thing 00:12:24")
        // name of thing 00:12:24,name of thing ,thing ,00,12,24
        parse.hours = m[3];
        parse.minutes = m[4];
        parse.seconds = m[5];
      } else if (m[1] && m[3] && m[4]) {
        // gjs> m=re.exec("name of thing 1:2")
        // name of thing 1:2,name of thing ,thing ,1,2,
        parse.minutes = m[3];
        parse.seconds = m[4];
      } else if (m[1] && m[3]) {
        // gjs> m=re.exec("name of thing 59")
        // name of thing 59,name of thing ,thing ,59,,
        parse.seconds = m[3];
      } else {
        parse.has_time = false;
      }

      // gjs> m=re.exec("name of thing")
      // ,,,,,
      // gjs> m=re.exec("name of thing 0")

      Utils.logObjectPretty(m);

      return true;
    }
    return false;
  }

  static parseTimerEntry(entry, quick) {
    if (entry.length === 0) {
      return undefined;
    }

    var parse = {
      entry: entry.trim(),
      name: "",
      hours: 0,
      minutes: 0,
      seconds: 0,
      hms: null,
      quick: quick,
      has_time: false,
      alarm_timer: undefined
    }

    if (KitchenTimerMenuItem.re_alarm(parse)) {
      return parse;
    }
    if (!KitchenTimerMenuItem.re_hms(parse)) {
      if (!KitchenTimerMenuItem.re_name_hms(parse)) {
        if (!KitchenTimerMenuItem.re_wildcard(parse)) {
          return undefined;
        }
      }
    }

    parse.hms = HMS.create(parse.hours, parse.minutes, parse.seconds);
    Utils.logObjectPretty(parse);
    return parse;
  }
});

var KitchenTimerQuickItem = GObject.registerClass(
class KitchenTimerQuickItem extends PopupMenu.PopupMenuItem {
  _init(menu, timers) {
    super._init(_("Quick"), { reactive: false });

    this._menu = menu;
    this._timers = timers;

    menu.addMenuItem(this);

    logger.debugging = timers.settings.debug;

    var layout = new St.BoxLayout({
      style_class: 'kitchentimer-quick-menu',
      x_expand: true
    });

    this.add(layout);

    this._entry = new St.Entry( {
      x_expand: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });
    this._entry.set_hint_text(_("Name 00:00:00"));
    this._entry.get_clutter_text().set_activatable(true);

    this._gogo = new PopupMenu.PopupSwitchMenuItem(_("Go"), false, {
      hover: false,
      style_class: null
    });

    layout.add_child(this._entry);
    layout.add_child(this._gogo);

    this._entry.get_clutter_text().connect('activate', (e) => {
      var entry = e.get_text();
      logger.debug('activate: '+entry);
      var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
      if (result) {
        this._entry.get_clutter_text().set_text("%s %s".format(result.name, result.hms.toString()));
        var timer = KitchenTimerMenuItem.addTimerStart(result, this._timers);
        if (timer === undefined) {
          this._gogo.set_active(false);
        } else {
          this._menu.close();
        }
      }
    });

    this._entry.get_clutter_text().connect('key-focus-out', (e) => {
      var entry = e.get_text();
      logger.debug('key out hours: '+entry);
      var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
      if (result) {
        this._entry.get_clutter_text().set_text("%s %s".format(result.name, result.hms.toString()));
      }
    });

    this._gogo.connect('toggled', (go) => {
      if (go.state) {
        var entry = this._entry.get_clutter_text().get_text().trim();

        var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
        if (!result) {
          logger.error("Invalid timer entry='%s'", entry);
          go.setToggleState(false);
          return;
        }

        var timer = KitchenTimerMenuItem.addTimerStart(result, this._timers);
        if (timer === undefined) {
          go.setToggledState(false);
        } else {
          this._menu.close();
        }
      }
    });
  }
});

var KitchenTimerControlButton = GObject.registerClass(
class KitchenTimerControlButton extends St.Button {
    _init(timer, type) {
        super._init();

        // 'media-playback-stop-symbolic'
        // 'edit-delete-symbolic'
        var icon = new St.Icon({
            icon_name: KTTypes[type],
            style_class: 'kitchentimer-menu-delete-icon'
        });
        icon.set_icon_size(20);

        this.child = icon;

        this._timer = timer;
    }

    delete() {
      this._timer.delete();
    }

    get icon() {
      return this.child;
    }

    stop() {
      this._timer.stop();
    }
});

