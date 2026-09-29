#!/bin/sh
# tl.sh <seconds> cmd... : run with a time limit
secs=$1; shift
exec perl -e 'alarm shift; exec @ARGV' "$secs" "$@"
