#!/bin/bash

ME=$(basename $0)
MD=$(dirname $0)
ED=kitchentimer@blackjackshellac.ca
ICONS_SCALABLE_APPS=~/.local/share/icons/hicolor/scalable/apps
ICONS_SYMBOLIC_APPS=~/.local/share/icons/hicolor/symbolic/apps

puts() {
	echo -e $*
}

log() {
	puts $*
}

info() {
	log "INFO" $*
}

die() {
	log "FATAL" $*
	exit 1
}

run() {
	info $*
	$*
	[ $? -ne 0 ] && die "Run command failed: $*"
}

run cd $MD
run cd $ED

run mkdir -p $ICONS_SCALABLE_APPS
run cp -puv *-full.svg ${ICONS_SCALABLE_APPS}/

run mkdir -p "$ICONS_SYMBOLIC_APPS"
run cp -puv *-symbolic.svg ${ICONS_SYMBOLIC_APPS}/


ldir="$(pwd)"

run cd ~/.local/share/gnome-shell/extensions
info "Creating symlink to $ldir"
run ln -sf $ldir .
run cd $ED
pwd

