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
const AlarmTimer = Me.imports.alarm_timer.AlarmTimer;
const Utils = Me.imports.utils;
const HMS = Me.imports.hms.HMS;
const Logger = Me.imports.logger.Logger;

var KTTypes = {
  'stop': 'media-playback-stop-symbolic',
  'delete' : 'edit-delete-symbolic',
  'reduce' : 'list-remove-symbolic',
  'extend' : 'list-add-symbolic',
  'backward' : 'media-seek-backward-symbolic',
  'forward' : 'media-seek-forward-symbolic',
  'persist' : 'alarm-symbolic',
  'progress' : null // dynamically assigned
}

var logger = new Logger('kt menuitem');

var KitchenTimerCreatePreset = GObject.registerClass(
class KitchenTimerCreatePreset extends PopupMenu.PopupSubMenuMenuItem {
  _init(menu, timers) {
    super._init(_("Create Preset"));
    this._timers = timers;
    logger.settings = timers.settings;

    menu.addMenuItem(this);

    this._entry = new St.Entry( {
      x_expand: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });
    this._entry.set_hint_text(_("Name 00:00:00"));
    this._entry.get_clutter_text().set_activatable(true);
    this._entry.set_primary_icon(KitchenTimerCreatePreset.create_icon(this._timers));

    var name_item = new PopupMenu.PopupMenuItem("", { reactive: false } );
    var bin = new St.Bin({ x_expand: true, x_align: St.Align.START });
    bin.child = this._entry;
    name_item.add(bin);
    this.menu.addMenuItem(name_item);

    this._name = "";

    this._hslider = new KitchenTimerTimeSliderItem(this, "h", 0, 99);
    this._mslider = new KitchenTimerTimeSliderItem(this, "m", 0, 59);
    this._sslider = new KitchenTimerTimeSliderItem(this, "s", 0, 59);

    this._go = new PopupMenu.PopupImageMenuItem(_("Create"), this._timers.progress_gicon(0));
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

  static create_icon(timers) {
    var icon = new St.Icon({
            gicon: timers.progress_gicon(0),
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

      logger.settings = timer.timers.settings;

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
        gicon: timer.timers.progress_gicon(key),
        style_class: 'kitchentimer-menu-icon'
      });
      timer_icon.set_icon_size(20);

      if (timer.running) {
        if (timer.alarm_timer) {
          box.add_child(new KitchenTimerControlButton(timer, 'forward'));
          box.add_child(new KitchenTimerControlButton(timer, 'stop'));
          box.add_child(new KitchenTimerControlButton(timer, 'backward'));
        } else {
          box.add_child(new KitchenTimerControlButton(timer, 'extend'));
          box.add_child(new KitchenTimerControlButton(timer, 'stop'));
          box.add_child(new KitchenTimerControlButton(timer, 'reduce'));
        }
      } else {
        box.add_child(new KitchenTimerControlButton(timer, 'delete'));
      }

      box.add_child(timer.label);
      if (timer.running) {
        if (timer.persist_alarm) {
          box.add_child(new KitchenTimerControlButton(timer, 'persist'));
        } else {
          box.add_child(new KitchenTimerControlButton(timer, 'progress'));
        }
      } else {
        box.add_child(timer_icon);
      }
      box.add_child(name);

      this.connect('activate', (tmi) => {
        if (!tmi._timer.running) {
          tmi._timer.start();
        }
      });

      timer.label_progress();

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

    logger.debug("matched in re_alarm");

    return true;

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
      //Utils.logObjectPretty(m);
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

      //Utils.logObjectPretty(m);

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
    //Utils.logObjectPretty(parse);
    return parse;
  }
});

var KitchenTimerEndTime = GObject.registerClass(
class KitchenTimerEndTime extends PopupMenu.PopupMenuItem {
  _init(menu, timers) {
    super._init(_("Show end time"), { reactive: false });

    this._menu = menu;
    this._timers = timers;

    menu.addMenuItem(this);

    var layout = new St.BoxLayout({
      style_class: 'kitchentimer-quick-menu',
      x_expand: true,
      y_expand: true
    });

    this.add(layout);

    var label = new St.Label({
      style_class: 'kitchentimer-menu-name',
      x_expand: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });
    //label.set_text(_("Show end time"));

    var show_endtime = this._timers.settings.show_endtime;

    //log("show_endtime=%s - %s".format(show_endtime, this._timers.settings));
    this._gogo = new PopupMenu.PopupSwitchMenuItem("", show_endtime, {
      hover: false,
      style_class: null
    });

    layout.add_child(label);
    layout.add_child(this._gogo);

    this._gogo.connect('toggled', (go) => {
      // go.state
      this._timers.settings.show_endtime = go.state;
    });
  }

});

var KitchenTimerQuickItem = GObject.registerClass(
class KitchenTimerQuickItem extends PopupMenu.PopupMenuItem {
  _init(menu, timers) {
    super._init("", { reactive: false, can_focus: false });

    this._menu = menu;
    this._timers = timers;

    menu.addMenuItem(this);

    logger.settings = timers.settings;

    var layout = new St.BoxLayout({
      style_class: 'kitchentimer-quick-menu',
      x_expand: true
    });

    this.add(layout);

    this._entry = new St.Entry( {
      x_expand: true,
      can_focus: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });
    this._entry.set_hint_text(_("Name 00:00:00"));
    this._entry.get_clutter_text().set_activatable(true);
    this._entry.get_clutter_text().set_editable(true);

    // this._gogo = new PopupMenu.PopupSwitchMenuItem(_("Go"), false, {
    //   hover: false,
    //   style_class: null
    // });

    this._add_icon = new St.Icon( {
      x_expand: false,
      y_align: Clutter.ActorAlign.CENTER,
      icon_name: 'list-add-symbolic',
      icon_size: 20,
    });

    this._add = new St.Button( {
      x_expand: false,
      y_expand: false,
      can_focus: true,
      x_align: St.Align.END,
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'kitchentimer-prefs-button',
      child: this._add_icon
    });

    this._add.connect('clicked', (btn, clicked_button) => {
      logger.debug("mouse button pressed %d", clicked_button);
      var entry = this._entry.get_clutter_text().get_text().trim();

      var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
      if (!result) {
        logger.error("Invalid timer entry='%s'", entry);
        return;
      }

      var timer = KitchenTimerMenuItem.addTimerStart(result, this._timers);
      if (timer) {
        this._menu.close();
        global.stage.set_key_focus(null);
      }
    });

    this._add.connect('enter_event', (btn, event) => {
      //btn.get_child().icon_name = 'preferences-system-symbolic';
      btn.get_child().icon_size = 28;
    })

    this._add.connect('leave_event', (btn, event) => {
      //btn.get_child().icon_name = 'open-menu-symbolic';
      btn.get_child().icon_size = 20;
    })

    this._prefs_icon = new St.Icon( {
      x_expand: false,
      y_align: Clutter.ActorAlign.CENTER,
      icon_name: 'preferences-system-symbolic',
      icon_size: 20,
    });

    this._prefs = new St.Button( {
      x_expand: false,
      y_expand: false,
      can_focus: true,
      x_align: St.Align.END,
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'kitchentimer-prefs-button',
      child: this._prefs_icon
    });

    this._prefs.connect('clicked', (btn, clicked_button) => {
      logger.debug("mouse button pressed %d", clicked_button);
      ExtensionUtils.openPrefs();
      this._menu.close();
      global.stage.set_key_focus(null);
    });

    this._prefs.connect('enter_event', (btn, event) => {
      //btn.get_child().icon_name = 'preferences-system-symbolic';
      btn.get_child().icon_size = 28;
    })

    this._prefs.connect('leave_event', (btn, event) => {
      //btn.get_child().icon_name = 'open-menu-symbolic';
      btn.get_child().icon_size = 20;
    })

    layout.add_child(this._entry);
    layout.add_child(this._add);
    layout.add_child(this._prefs);
    //layout.add_child(this._gogo);

    this._entry.get_clutter_text().connect('activate', (e) => {
      var entry = e.get_text();
      logger.debug('activate: '+entry);
      var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
      if (result) {
        this._entry.get_clutter_text().set_text("%s %s".format(result.name, result.hms.toString()));
        var timer = KitchenTimerMenuItem.addTimerStart(result, this._timers);
        if (timer === undefined) {
          //this._gogo.set_active(false);
        } else {
          this._menu.close();
        }
      }
    });

    this._entry.get_clutter_text().connect('key-focus-out', (e) => {
      var entry = e.get_text();
      if (entry.length > 0) {
        logger.debug('key out hours: '+entry);
        var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
        if (result) {
          this._entry.get_clutter_text().set_text("%s %s".format(result.name, result.hms.toString()));
        }
      }
    });

    // this._gogo.connect('toggled', (go) => {
    //   if (go.state) {
    //     var entry = this._entry.get_clutter_text().get_text().trim();

    //     var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
    //     if (!result) {
    //       logger.error("Invalid timer entry='%s'", entry);
    //       go.setToggleState(false);
    //       return;
    //     }

    //     var timer = KitchenTimerMenuItem.addTimerStart(result, this._timers);
    //     if (timer === undefined) {
    //       go.setToggledState(false);
    //     } else {
    //       this._menu.close();
    //     }
    //   }
    // });

  }

  grab_key_focus() {
    logger.debug("grab key focus")
    this._entry.grab_key_focus();
  }
});

var KitchenTimerControlButton = GObject.registerClass(
class KitchenTimerControlButton extends St.Button {
    _init(timer, type) {
        super._init();

        this._type = type;
        this._timer = timer;

        // 'media-playback-stop-symbolic'
        // 'edit-delete-symbolic'

        let icon=null;
        let gicon=null;
        let style='kitchentimer-menu-delete-icon';
        if (type === 'progress') {
          if (!timer.persist_alarm) {
            gicon = timer.timers.progress_gicon(timer.degree_progress(15 /* 15 degree increments */));
            style='kitchentimer-menu-icon';
          }
        } else if (type === 'persist') {
          style='kitchentimer-menu-icon';
        }
        if (gicon) {
          icon = new St.Icon({
            x_align: St.Align.END,
            x_expand: false,
            gicon: gicon,
            style_class: style
          });
        } else {
          icon = new St.Icon({
            x_align: St.Align.END,
            x_expand: false,
            icon_name: KTTypes[type],
            style_class: style
          });
        }
        icon.set_icon_size(20);

        this.child = icon;

        this.connect_type();
    }

    connect_type() {
        switch(this.type) {
        case "stop":
          this.connect('clicked', (cb) => {
            this.timer.stop();
            this.rebuild();
          });
          break;
        case "delete":
          this.connect('clicked', (cb) => {
            this.timer.delete();
            this.rebuild();
          });
          break;
        case "extend":
          this.connect('clicked', (cb) => {
            this.timer.extend();
            this.rebuild();
          });
          break;
        case "reduce":
          this.connect('clicked', (cb) => {
            this.timer.reduce();
            this.rebuild();
          });
          break;
        case "forward":
          this.connect('clicked', (cb) => {
            this.timer.forward();
            this.rebuild();
          });
          break;
        case "backward":
          this.connect('clicked', (cb) => {
            this.timer.backward();
            this.rebuild();
          });
          break;
        case 'persist':
        case 'progress':
          this.connect('clicked', (cb) => {
            this.timer.toggle_persist_alarm();
            this.rebuild();
          });
          break;
        }
    }

    get timer() {
      return this._timer;
    }

    get type() {
      return this._type;
    }

    get icon() {
      return this.child;
    }

    rebuild() {
      this.timer.timers.indicator.rebuild_menu();
    }
});

