/** Which letters of each word tire on their own beat (first word: the t of Rustam; second: A and n). */
const LETTERS: readonly (readonly number[])[] = [[3], [0, 4]];
/** The second word's letters keep different beats. */
const BEAT = ['', 'b', 'c'];

/**
 * The name as neon: now and then one whole word dips, RUSTAM and ASLANOV in turn, while single letters tire
 * on slower beats of their own. All inline inside one span, so it still reads "Rustam Aslanov" as a name.
 */
export default function NameTubes({ name }: { name: string }) {
  let beat = 0;
  const words = name.split(' ');
  return (
    <span>
      {words.map((word, w) => (
        <span key={w}>
          {w > 0 && ' '}
          <span className={`neon-word${w > 0 ? ' neon-word-2' : ''}`}>
            {[...word].map((ch, i) =>
              (LETTERS[w] ?? []).includes(i) ? (
                <span key={i} className={`neon-letter ${BEAT[beat++ % BEAT.length]}`.trim()}>
                  {ch}
                </span>
              ) : (
                ch
              ),
            )}
          </span>
        </span>
      ))}
    </span>
  );
}
