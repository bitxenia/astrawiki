export function swapRandomWords(
  content: string,
  amountOfSwaps: number,
): string {
  const words = content.split(" ");

  if (words.length < 2) return content;

  for (let i = 0; i < amountOfSwaps; i++) {
    const [i1, i2] = getTwoRandomIndices(words.length);
    [words[i1], words[i2]] = [words[i2], words[i1]];
  }

  return words.join(" ");
}

function getTwoRandomIndices(max: number): [number, number] {
  let i = Math.floor(Math.random() * max);
  let j = Math.floor(Math.random() * max);
  while (j === i) {
    j = Math.floor(Math.random() * max);
  }
  return [i, j];
}
