#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "$SDK_ROOT" || ! -f "$SDK_ROOT/platforms/android-35/android.jar" ]]; then
  echo 'Set ANDROID_SDK_ROOT to an SDK with platform android-35 and build-tools 35.0.0.' >&2
  exit 1
fi
BT="$SDK_ROOT/build-tools/35.0.0"
PLATFORM="$SDK_ROOT/platforms/android-35/android.jar"
mkdir -p build/classes build/dex dist signing
rm -rf build/classes/* build/dex/*
rm -f build/resources.zip build/base.apk build/classes.jar build/unsigned.apk build/aligned.apk
if command -v javac >/dev/null 2>&1; then
  javac -encoding UTF-8 -source 8 -target 8 -bootclasspath "$PLATFORM:$BT/core-lambda-stubs.jar" -d build/classes $(find app/src/main/java -name '*.java')
else
  if [[ ! -f tools/ecj.jar ]]; then
    mkdir -p tools
    curl -fL https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.38.0/ecj-3.38.0.jar -o tools/ecj.jar
  fi
  java -jar tools/ecj.jar -8 -encoding UTF-8 -nowarn -proc:none -bootclasspath "$PLATFORM:$BT/core-lambda-stubs.jar" -d build/classes app/src/main/java/app/copyreader/clean/*.java
fi
"$BT/aapt2" compile --dir app/src/main/res -o build/resources.zip
"$BT/aapt2" link -o build/base.apk --manifest app/src/main/AndroidManifest.xml -I "$PLATFORM" -A app/src/main/assets build/resources.zip --min-sdk-version 26 --target-sdk-version 35
python3 - <<'PY'
import pathlib,zipfile
with zipfile.ZipFile('build/classes.jar','w') as z:
    for p in pathlib.Path('build/classes').rglob('*.class'): z.write(p,p.relative_to('build/classes'))
PY
bash "$BT/d8" --min-api 26 --lib "$PLATFORM" --output build/dex build/classes.jar
python3 - <<'PY'
import zipfile,pathlib,shutil
shutil.copy2('build/base.apk','build/unsigned.apk')
with zipfile.ZipFile('build/unsigned.apk','a') as z:
    for p in pathlib.Path('build/dex').glob('*.dex'): z.write(p,p.name,compress_type=zipfile.ZIP_DEFLATED)
PY
if [[ ! -f signing/debug.keystore ]]; then
  keytool -genkeypair -keystore signing/debug.keystore -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=CopyReader Personal Build,O=Personal,C=CN' -noprompt
fi
"$BT/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
bash "$BT/apksigner" sign --ks signing/debug.keystore --ks-pass pass:android --key-pass pass:android --out dist/CopyReader-1.12.1.apk build/aligned.apk
bash "$BT/apksigner" verify --verbose dist/CopyReader-1.12.1.apk
echo 'Built dist/CopyReader-1.12.1.apk'
