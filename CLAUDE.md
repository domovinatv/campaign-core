# campaign-core — CLAUDE.md

Jezgra kampanje za P2P zajedničko financiranje. Izvor istine za odluke je
energy.domovina.ai `docs/19-podatkovna-jezgra-kampanje.md`; ovaj repo izvodi
njegov plan (J1 paket, J2 D1 migracije, J4 Worker).

## Pravila

1. **Pravna granica je u shemi.** `tokenization`, `realestate`, `token_tranche`,
   pozicije i sve što nosi očekivanje prinosa ili udio u dobiti **ne ulazi** u
   skupove, tipove ni tablice, ni kao neaktivna vrijednost. Mapper to odbija s
   razlogom, nikad ne prevodi tiho. Vidi energy `docs/03` §3, `docs/14` §2.4.
2. **Tip i opis tablice se ne razilaze.** Svako polje u `src/types.ts` ima red u
   `src/contract.ts` (`TableSpec<T>` to provjerava kompilator). Novi stupac =
   oba mjesta + D1 migracija (aditivno) + po potrebi `pinka` referenca.
3. **Skupovi su zatvoreni.** U D1 su `CHECK`; promjena traži migraciju koja
   prepisuje tablicu. Novi član skupa ide odlukom u energy `docs/19` §6.
4. **Rail je izvor istine za novac.** Knjiga doprinosa ovdje je projekcija i mora
   se moći ponovo izgraditi iz raila i lanca. Idempotentni ključevi iz
   `contributions.unique` se ne uklanjaju.
5. **Novac u centima (INTEGER), vrijeme u unix ms (INTEGER).** Testovi to provjeravaju.
6. **Snimka pinke se samo čita.** `scripts/snapshot-pinka.sh` radi `SELECT` nad
   `information_schema`; u `pinka_finance` se odavde nikad ne piše.
7. **Nikad `any`.** `npm run verify` prije svakog commita.

## Izdavanje

Potrošači (energy, solardei) uvoze kao `github:domovinatv/campaign-core#vX.Y.Z`.
Izmjena koja mijenja tip ili opis tablice = nova verzija + tag; bez taga
potrošači ne vide promjenu.
