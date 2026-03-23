'use strict';


// トークンIDで、トークンリストをソートする関数
export function sortTokenListById(tokenList) {
    return tokenList.sort((a, b) => {
        const regex = /(\D*)(\d*)$/;
        const [, aText, aNum] = a.id.match(regex);
        const [, bText, bNum] = b.id.match(regex);

        if (aNum && bNum) {
            return parseInt(aNum) - parseInt(bNum);
        } else if (aNum) {
            return 1;
        } else if (bNum) {
            return -1;
        } else {
            return a.localeCompare(b);
        }
    });
}