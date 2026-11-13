/** Placeholder until the case overlay lands (plan 2, task 7). */
export function generateStaticParams() {
  return [{ slug: 'altus' }];
}

export default async function CasePage({ params }: PageProps<'/[locale]/work/[slug]'>) {
  const { slug } = await params;
  return (
    <div role="dialog" aria-labelledby="case-title" data-ui className="fixed inset-0 z-40 bg-[#050507]/80 p-8">
      <h2 id="case-title">{slug}</h2>
    </div>
  );
}
