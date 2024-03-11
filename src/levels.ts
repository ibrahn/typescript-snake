import { TextToFieldMapping } from "./field";

const levelTextMapping: TextToFieldMapping = {
    ' ': 0x00,
    '#': 0xd0,
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
