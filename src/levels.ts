import { GameElements } from "./game-elements";
import { TextToFieldMapping } from "./field";

const levelTextMapping: TextToFieldMapping = {
    ' ': GameElements.Space,
    '.': GameElements.Space,
    '#': GameElements.WallHeavy,
    '=': () => {
        const r = Math.random() * 0x8 - 0x4;
        return GameElements.WallMedium + r;
    },
    '+': GameElements.WallMedium,
    '~': (GameElements.WallMedium + GameElements.WallLight) / 2,
    '-': GameElements.WallLight,
};
const levelList = [

// edge gates
`
#==========#        #==========#
=                              =
=                              =
=                              =
=                              =
#        -            -        #
         ~            ~
         +            +
         =            =
         =            =
         +            +
         ~            ~
#        -            -        #
=                              =
=                              =
=                              =
=                              =
#==========#        #==========#
`.trim(),

// cage
`
=+~-                        -~+=
-                              -


      #=====+~-  -+======#
      =                  =
      =                  =
      =                  =
      =                  =
      =                  =
      =                  =
      =                  =
      #====#        #====#



-                              -
=+~-                        -~+=
`.trim(),

// highway
`
#+~-                        -~+#
=                              =
=                              =
=                              =
#                              =
##=================+~--       ##






##       --~+=================##
=                              #
=                              =
=                              =
=                              =
#+~-                        -~+#
`.trim(),

];

export { levelList, levelTextMapping };
