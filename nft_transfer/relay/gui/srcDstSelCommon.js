// 選択対象の集合から、選択対象の候補のリストを作る関数
const makeAnOptionList = (firstOption, items) => {
    const uniqueItems = removeRedundantObjectInArray(items);
    uniqueItems.sort();
    return [firstOption, ...uniqueItems];
};
