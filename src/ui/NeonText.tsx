/**
 * A neon word with one tired letter: the letter at `dead` sits dim and only now and then catches. The word
 * is one inline run inside the tube's flex box, so it still reads as one word ("Rustam", not "Rus t am")
 * to screen readers and in accessible names.
 */
export default function NeonText({ text, dead }: { text: string; dead?: number }) {
  if (dead === undefined || dead < 0 || dead >= text.length) return <>{text}</>;
  return (
    <span>
      {text.slice(0, dead)}
      <span className="neon-dead">{text[dead]}</span>
      {text.slice(dead + 1)}
    </span>
  );
}
