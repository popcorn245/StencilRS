/**
 * @popcorn245/cards-core — the framework-free card domain (types + pure
 * functions) shared by bucket-bot (recognition/pricing/worker), bucket-hub
 * (Cards tab + unified scanner), and the yugioh app (docs
 * planned/yugioh-app/architecture §cards-core-extraction). No Firebase, no
 * Stencil, no DOM — each consumer wires its own I/O.
 */
export {
  CARD_CLASS,
  containerOf,
  itemMetadata,
  type Card,
  type CardCondition,
  type CardEdition,
  type CardItemLike,
  type CardMetadata,
  type CardScanState,
  type CardVisibility,
  type Container,
} from './types.js';

export {
  cardArtUrl,
  cardLevelPrice,
  editDistance,
  firstCard,
  fuzzyMatchPrinting,
  makePrintingId,
  matchPrinting,
  normalizeRarity,
  normalizeSetCode,
  ocrKey,
  parseMoney,
  pickLikelyFrom,
  pickLikelyPrinting,
  pricedSpread,
  resolvePriceFromCard,
  type CardPrice,
  type CardPriceProvider,
  type CardPriceResolved,
  type MatchQuality,
  type PriceForInput,
  type PriceSpread,
  type YgoBanlistInfo,
  type YgoCard,
  type YgoCardImage,
  type YgoCardPrices,
  type YgoSet,
} from './pricing.js';

export {
  COPY_CAP,
  EXTRA_MAX,
  MAIN_MAX,
  MAIN_MIN,
  SIDE_MAX,
  banlistCap,
  deckPartSize,
  isExtraDeckFrame,
  validateDeck,
  type DeckCardInfo,
  type DeckCardLookup,
  type DeckDoc,
  type DeckEntry,
  type DeckPart,
  type DeckValidation,
  type DeckViolation,
  type DeckViolationCode,
} from './deck.js';

export { parseYdk, serializeYdk, type ParsedYdk } from './ydk.js';
export { decodeYdke, encodeYdke, type YdkeDeck } from './ydke.js';
export {
  choose,
  countInCategory,
  expandPart,
  monteCarloCompound,
  pAtLeastK,
  pExactlyK,
  shuffle,
} from './deck-probability.js';

export {
  buildCardMetadata,
  buildPrintingMetadata,
  normalizeEdition,
  type CardRead,
} from './metadata.js';

export {
  findStackMatch,
  itemStackKey,
  stackKey,
  type StackTarget,
} from './stacking.js';

export {
  displayGroupKey,
  groupCardsForDisplay,
  type CardGroup,
} from './display-grouping.js';

export {
  cardMetaStr,
  cardPrice,
  categoryClassLabel,
  categoryLabel,
  containerIcon,
  groupCategoryLabel,
  isCard,
  needsReview,
} from './items.js';

export {
  cardsPortfolio,
  cardsTotal,
  collectionTotal,
  collectionValue,
  type CardsPortfolio,
  type CollectionValue,
} from './portfolio.js';

export {
  cardsInContainer,
  deckKindOf,
  deckStripEntries,
  isDeckLike,
  type DeckKind,
  type DeckStripEntry,
} from './deck-strip.js';

export { ScanIngestGate, type ScanIngestGateOptions } from './scan-dedupe.js';
export { Draw2HealthMonitor, type Draw2HealthMonitorOptions } from './draw2-health-monitor.js';
