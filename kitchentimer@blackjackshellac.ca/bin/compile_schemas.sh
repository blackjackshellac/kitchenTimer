#!/bin/bash

ME=$(basename $0)
MD=$(cd $(dirname $0); pwd)
SCHEMA_DIR=$(cd $MD/../schemas; pwd)

bin=gschemas.compiled
xml=org.gnome.shell.extensions.kitchen-timer-blackjackshellac.gschema.xml

if [ $xml -nt $bin ]; then
	echo glib-compile-schemas --strict $SCHEMA_DIR
	glib-compile-schemas --strict $SCHEMA_DIR
else
	echo No need to compile $xml to $bin
fi


