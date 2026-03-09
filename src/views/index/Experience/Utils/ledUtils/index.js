import ledBaseArray from "./ledBaseArray";

/**
 * Replace 1s in a 2D array with the given color, leave 0s unchanged, return the result
 * @param {*} baseArray Base array with values of 0 or 1
 * @param {*} color Replacement color
 * @returns
 */
export const replaceBaseArrayColor = (baseArray, color) => {
  const baseArrayCopy = JSON.parse(JSON.stringify(baseArray));
  for (let i = 0; i < baseArrayCopy.length; i++) {
    for (let j = 0; j < baseArrayCopy[i].length; j++) {
      if (baseArrayCopy[i][j] === 1) {
        baseArrayCopy[i][j] = color;
      }
    }
  }
  return baseArrayCopy;
};

/**
 * Convert a number to a base array
 * Fixed display digits, insert a blank column between each digit
 * @param {*} num The number to convert (positive integer)
 * @param {*} len Display digits. 0: unlimited. >0: limit to this many digits
 * @param {*} enableZeroPadding Whether to pad with leading zeros
 * @returns
 */
export const numToArray = (num, len = 0, enableZeroPadding = false) => {
  if (!Number.isInteger(num) || !Number.isInteger(len) || num < 0 || len < 0) {
    return [];
  }

  // Convert to string for easier concatenation
  const numStr = num.toString();
  let paddedStr = "";
  let numArray = [];

  if (len === 1) {
    // len=1, directly return the corresponding single-digit base array
    return ledBaseArray[num % 10];
  } else if (len > 1 && numStr.length >= len) {
    // Number exceeds digit count, keep only the specified number of digits
    numArray = numStr.split("").slice(-len);
  } else if (enableZeroPadding && numArray.length < len) {
    // Check if zero-padding is needed; if not, skip padding but max digits cannot exceed len; if yes, pad with zeros, max digits also cannot exceed len
    paddedStr = numStr.padStart(len, "0");
    numArray = paddedStr.split("");
  } else {
    numArray = numStr.split("");
  }

  const resultArray = numArray.flatMap((item) => [
    ...ledBaseArray[item],
    ...ledBaseArray.numBlank,
  ]);
  resultArray.pop();

  return resultArray;
};

/**
 * Get the base array for the current time
 * @returns Time base array
 */
export const getTimeArray = () => {
  // Get current time
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // Convert hours, minutes, seconds to their corresponding arrays
  const hoursArray = numToArray(hours, 2, true);
  const minutesArray = numToArray(minutes, 2, true);
  const secondsArray = numToArray(seconds, 2, true);

  const colon = [
    ...ledBaseArray.numBlank,
    ...ledBaseArray.numColon,
    ...ledBaseArray.numBlank,
  ];

  return [...hoursArray, ...colon, ...minutesArray, ...colon, ...secondsArray];
};

/**
 * Get the base array for the current day of the week
 * @param {*} opts Options, e.g. color, otherColor
 * @returns
 */
export const getWeekArray = (
  opts = {
    color: "#33dd77",
    otherColor: "#228855",
  }
) => {
  let week = new Date().getDay();
  if (week === 0) week = 7;

  let weekData = [];
  for (let i = 1; i <= 7; i++) {
    const color = i === week ? opts.color : opts.otherColor;
    weekData.push([color], [color], [color], [0]);
  }
  weekData.pop();
  return weekData;
};

/**
 * Merge into the final array
 * @param {*} sourceArray Source array, e.g. a [40][9] array
 * @param {*} arrays Arrays to merge and their positions [col column position, row position, array]
 */
export const mergeIntoArray = (sourceArray, arrays) => {
  const sourceArrayCopy = JSON.parse(JSON.stringify(sourceArray));

  arrays.forEach((item, index) => {
    const { col, row, array } = item;

    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array[i].length; j++) {
        sourceArrayCopy[col + i][row + j] = array[i][j];
      }
    }
  });

  return sourceArrayCopy;
};

export default {
  replaceBaseArrayColor,
  numToArray,
  getTimeArray,
  getWeekArray,
  mergeIntoArray,
};
