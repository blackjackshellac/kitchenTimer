#!/bin/bash

#Kitchen_Timer_3_38_ver6

ME=$(basename $0)
MD=$(cd $(dirname $0); pwd)

test=""

info() {
	echo -e "${test}> $*"
}

[ $# -lt 2 ] && test="DRYRUN" && info -e "set > 1 parameters to create tag"

info $MD
cd $MD/../kitchentimer@blackjackshellac.ca
[ $? -ne 0 ] && echo "Failed to change to extension directory" && exit 1

info Working in $(pwd)

gsv=$(gnome-shell --version | cut -f1,2 -d'.' | sed 's/[a-z ]//gi')
gsv=$(cat metadata.json | ruby -rjson -e 'puts JSON.parse(STDIN.read)["shell-version"].join("_").gsub(/[.]/,"_")')
ver=$(cat metadata.json | ruby -rjson -e 'puts JSON.parse(STDIN.read)["version"]')
ver=$(echo -n $ver)

msg="Kitchen Timer ver$ver for Gnome Shell $gsv"
tag_name=$(echo -n $msg | sed 's/[ \.]/_/g')
info git tag -a $tag_name -m "$msg"

[ -z "$test" ] && git tag -a $tag_name -m "$msg"

info Tags ...
git tag
