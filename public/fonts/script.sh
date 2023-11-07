            for ttf in ttf/*.ttf; do
              echo "processing $ttf"

              name=`basename -s .ttf $ttf`
              pyftsubset \
                $ttf \
                --output-file=woff2/"$name".woff2 \
                --flavor=woff2 \
                --layout-features=* \
                --no-hinting \
                --desubroutinize \
                --unicodes="U+0000-0170,U+00D7,U+00F7,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-21BB,U+2212,U+2215,U+F8FF,U+FEFF,U+FFFD,U+00E8"
            done
