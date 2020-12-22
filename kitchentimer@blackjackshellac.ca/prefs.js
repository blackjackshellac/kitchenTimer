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

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Settings = Me.imports.settings.Settings;


class PreferencesBuilder {
    constructor() {
        this._settings = new Settings().settings;
        this._builder = new Gtk.Builder();
    }

    build() {
        this._builder.add_from_file(Me.path + '/settings.ui');
        this._settingsBox = this._builder.get_object('kitchenTimer_settings');

        this._viewport = new Gtk.Viewport();
        this._viewport.add(this._settingsBox);
        this._widget = new Gtk.ScrolledWindow();
        this._widget.add(this._viewport);


        // this._builder.get_object('auto_power_off_settings_button').connect('clicked', () => {
        //     let dialog = new Gtk.Dialog({
        //         title: 'Auto power off settings',
        //         transient_for: this._widget.get_toplevel(),
        //         use_header_bar: true,
        //         modal: true
        //     });


        //     let box = this._builder.get_object('auto_power_off_settings');
        //     dialog.get_content_area().add(box);

        //     dialog.connect('response', (dialog) => {
        //         dialog.get_content_area().remove(box);
        //         dialog.destroy();
        //     });

        //     dialog.show_all();
        // });


        this._bind();

        return this._widget;
    }

    _bind() {
        // let autoPowerOnSwitch = this._builder.get_object('auto_power_on_switch');
        // this._settings.bind('bluetooth-auto-power-on', autoPowerOnSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        // let autoPowerOffSwitch = this._builder.get_object('auto_power_off_switch');
        // this._settings.bind('bluetooth-auto-power-off', autoPowerOffSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        // let autoPowerOffInterval = this._builder.get_object('auto_power_off_interval');
        // this._settings.bind('bluetooth-auto-power-off-interval', autoPowerOffInterval, 'value', Gio.SettingsBindFlags.DEFAULT);

        // let keepMenuOnToggleSwitch = this._builder.get_object('keep_menu_on_toggle');
        // this._settings.bind('keep-menu-on-toggle', keepMenuOnToggleSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        // let refreshButtonOnSwitch = this._builder.get_object('refresh_button_on');
        // this._settings.bind('refresh-button-on', refreshButtonOnSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

        // let debugModeOnSwitch = this._builder.get_object('debug_mode_on');
        // this._settings.bind('debug-mode-on', debugModeOnSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
    }

}

function init() {
}

function buildPrefsWidget() {
    let settings = new PreferencesBuilder();
    let widget = settings.build();
    widget.show_all();

    return widget;
}
