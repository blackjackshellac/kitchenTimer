#!/bin/bash

ME=$(basename $0)
MD=$(dirname $0)
ED=kitchentimer@blackjackshellac.ca
USR_SHARE=~/.local/share
ICONS=$USR_SHARE/icons/hicolor
ICONS_SCALABLE_APPS=$ICONS/scalable/apps
ICONS_SYMBOLIC_APPS=$ICONS/symbolic/apps
EXTENSIONS=$USR_SHARE/gnome-shell/extensions
SCHEMAS=$USR_SHARE/glib-2.0/schemas

declare -i DEBUG=${KITCHENTIMER_DEBUG:=0}

puts() {
	echo -e $*
}

log() {
	puts $*
}

info() {
	log "INFO" $*
}

warn() {
	log "WARN" $*
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

[ $DEBUG -ne 0 ] && warn "DEBUG is enabled"

run cd $MD
run cd $ED

run mkdir -p $SCHEMAS
run cp -puv schemas/*.xml $SCHEMAS/
run glib-compile-schemas --strict $SCHEMAS

run xgettext --from-code=UTF-8 --output=po/kitchen-timer-blackjackshellac.pot *.js *.ui schemas/*.xml

run mkdir -p $ICONS_SCALABLE_APPS
run cp -puv *-full.svg ${ICONS_SCALABLE_APPS}/

run mkdir -p "$ICONS_SYMBOLIC_APPS"
run cp -puv *-symbolic.svg ${ICONS_SYMBOLIC_APPS}/

ldir="$(pwd)"

if [ $DEBUG -ne 0 ]; then
  warn "DEBUG is enabled"
  info "Creating symlink to $ldir"
  run cd $EXTENSIONS
  [ ! -L "$ED" ] && run rm -rfv $ED
  run ln -sf $ldir .
else
  info "Installing extension in $EXTENSIONS/$ED"
  [ -L "$EXTENSIONS/$ED" ] && rm -v $EXTENSIONS/$ED
  run rsync -av . $EXTENSIONS/$ED
fi
run cd $EXTENSIONS/$ED
pwd

info "Alt-F2 'r' to restart gnome shell"

