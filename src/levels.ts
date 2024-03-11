import { GameElements } from "./game-elements";
import { TextToFieldMapping } from "./field";

const levelTextMapping: TextToFieldMapping = {
    ' ': GameElements.Space,
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
#                              #






#                              #
#                              #
#                              #
#                              #
#                              #
############        ############
`.trim(),


];

export { levelList, levelTextMapping };
