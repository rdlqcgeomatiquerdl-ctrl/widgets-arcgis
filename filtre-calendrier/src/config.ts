import { ImmutableObject } from 'jimu-core';

export interface Config {
  fieldStart: string;
  fieldEnd: string;
  titreWidget: string;
  fieldHistoriquePlages?: string;
  fieldConcatReglement?: string;
  fieldZonage?: string;
  activerExport?: boolean;
}

export type IMConfig = ImmutableObject<Config>;
