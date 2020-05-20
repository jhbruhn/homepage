#!/bin/bash

WORKING_DIRECTORY=$(pwd)
PUBLIC_WWW=$HOME/html
BACKUP_WWW=$HOME/backup_html
MY_DOMAIN=jhbruhn.de

set -e

mkdir -p $PUBLIC_WWW/

rsync -aqz $PUBLIC_WWW/ $BACKUP_WWW
trap "echo 'An issue has been occurred.  Reverting to backup.'; rsync -aqz --del $BACKUP_WWW/ $PUBLIC_WWW; rm -rf $WORKING_DIRECTORY" EXIT

rm -rf $PUBLIC_WWW/*
~/bin/hugo -s $WORKING_DIRECTORY -d $PUBLIC_WWW -b "https://${MY_DOMAIN}"
rm -rf $WORKING_DIRECTORY
trap - EXIT
