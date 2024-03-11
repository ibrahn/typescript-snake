import { GameElements } from "./game-elements";
import { TextToFieldMapping } from "./field";

const levelTextMapping: TextToFieldMapping = {
    ' ': GameElements.Space,
    '.': GameElements.Space,
    '#': GameElements.Wall,
};
const levelList = [

// edge gates
`
############        ############
#                              #
#                              #
#                              #
#                              #
#        #            #        #
         #            #
         #            #
         #            #
         #            #
         #            #
         #            #
#        #            #        #
#                              #
#                              #
#                              #
#                              #
############        ############
`.trim(),

// cage
`
####                        ####
#                              #


      #########  #########
      #                  #
      #                  #
      #                  #
      #                  #
      #                  #
      #                  #
      #                  #
      ######        ######



#                              #
####                        ####
`.trim(),

// highway
`
####                        ####
#                              #
#                              #
#                              #
#                              #
#######################       ##






##       #######################
#                              #
#                              #
#                              #
#                              #
####                        ####
`.trim(),

];

export { levelList, levelTextMapping };
