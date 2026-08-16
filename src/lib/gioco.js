import { Gioco, storageLocale } from '../../base44/shared/engine/gioco';

/** Istanza condivisa del servizio di gioco: il motore gira nel client. */
export const gioco = new Gioco(storageLocale);