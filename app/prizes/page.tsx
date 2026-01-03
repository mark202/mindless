import { PrizeLedgerTable } from '../../components/PrizeLedgerTable';
import { mindlessConfig } from '../../lib/appConfig';
import { loadManagers, loadPrizes } from '../../lib/data';

export default async function PrizesPage() {
  const [prizes, managers] = await Promise.all([loadPrizes(), loadManagers()]);

  return (
    <section className="space-y-4">
      <PrizeLedgerTable
        items={prizes.items}
        totals={prizes.totalsByEntryId}
        managers={managers.managers}
        currency={mindlessConfig.currency}
      />
    </section>
  );
}
