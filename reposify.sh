#! /bin/bash

set -e

repodir=$1
repofile=$2

function get_json_entry()
{
    cmd="cat $1 | sed -n 's/\"$2\"[[:space:]]*:[[:space:]]*\"\(.*\)\"[[:space:]]*,*/\1/p'|sed -e 's/^[[:space:]]*//'"
    value=$(eval "$cmd")
    echo "$value"
}

function join_by { local IFS="$1"; shift; echo "$*"; }

function gen_pkg_meta()
{
    author=$(get_json_entry "$1/package.json" "author")
    name=$(get_json_entry "$1/package.json" "name")
    category=$(get_json_entry "$1/package.json" "category")
    version=$(get_json_entry "$1/package.json" "version")
    printf "\t{\n"
    printf "\t\t\"pkgname\": \"%s\",\n" "$2"
    printf "\t\t\"name\": \"%s\",\n" "$name"
    printf "\t\t\"description\": \"https://raw.githubusercontent.com/lxsang/antosdk-apps/master/%s/README.md\",\n" "$2"
    printf "\t\t\"category\": \"%s\",\n" "$category"
    printf "\t\t\"author\": \"%s\",\n" "$author"
    printf "\t\t\"version\": \"%s\",\n" "$version"
    printf "\t\t\"download\": \"https://raw.githubusercontent.com/lxsang/antosdk-apps/master/%s/build/release/%s.zip\"\n" "$2" "$2"
    printf "\t}\n"
}
# generate packages meta-data
[ ! -d "$repodir" ] && echo "No such directory: $repodir" && exit 1
[ -z "$repofile" ] && repofile="packages.json"
echo "[" > "$repofile"
for file in "$repodir"/* ; do
    if [ -d "$file" ]; then
        pkgname=$(basename "$file")
        # test if it has release file
        pkgpath="$file/build/release/$pkgname.zip"
        if [ -f "$pkgpath" ] && [ -f "$file/package.json" ]; then
            #read the package meta-data
            meta=$(gen_pkg_meta "$file" "$pkgname")
            printf "%s,\n" "$meta" >> "$repofile"
        fi
    fi
done
sed '$ s/,$//' < "$repofile" > "$repofile.tmp"
printf "\n]" >> "$repofile.tmp"
mv "$repofile.tmp" "$repofile"
