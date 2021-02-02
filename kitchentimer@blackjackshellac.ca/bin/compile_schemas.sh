#!/bin/bash

ME=$(basename "${BASH_SOURCE[0]}")
MD="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
SCHEMA_DIR=$(cd $MD/../schemas; pwd)

bin=gschemas.compiled
xml=org.gnome.shell.extensions.kitchen-timer-blackjackshellac.gschema.xml

if [ $xml -nt $bin ]; then
	echo glib-compile-schemas --strict $SCHEMA_DIR
	glib-compile-schemas --strict $SCHEMA_DIR
	exit $?
else
	echo No need to compile $xml to $bin
	exit 0
fi

