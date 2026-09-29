/** @jsx jsx */
import { React, jsx, Immutable, UseDataSource, DataSourceComponent } from 'jimu-core';
import { AllWidgetSettingProps } from 'jimu-for-builder';
import { DataSourceSelector, AllDataSourceTypes } from 'jimu-ui/advanced/data-source-selector';
import { SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';
import { Select, Option, TextInput, Switch } from 'jimu-ui';
import { IMConfig } from '../config';

const Setting = (props: AllWidgetSettingProps<IMConfig>) => {
  const [schemaFields, setSchemaFields] = React.useState<any[]>([]);

  const onDataSourceChange = (useDataSources: UseDataSource[]) => {
    props.onSettingChange({
      id: props.id,
      useDataSources: useDataSources
    });
  };

  const onFieldChange = (key: string, value: any) => {
    props.onSettingChange({
      id: props.id,
      config: props.config.set(key, value)
    });
  };

  const supportedTypes = Immutable([AllDataSourceTypes.FeatureLayer]);

  return (
    <div className="widget-setting-filtre-calendrier" css={{ padding: '15px' }}>
      
      {props.useDataSources && props.useDataSources.length > 0 && (
        <DataSourceComponent
          useDataSource={props.useDataSources[0]}
          query={null}
          widgetId={props.id}
          onDataSourceCreated={(ds) => {
            const schema = ds.getSchema();
            if (schema && schema.fields) {
              setSchemaFields(Object.values(schema.fields));
            }
          }}
        />
      )}

      <SettingSection title="1. Sélectionner la couche :">
        <SettingRow>
          <DataSourceSelector
            types={supportedTypes}
            useDataSources={props.useDataSources}
            useDataSourcesEnabled={true}
            onToggleUseDataEnabled={() => {}}
            onChange={onDataSourceChange}
            widgetId={props.id}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="2. Titre / Thématique :">
        <SettingRow>
          <TextInput
            type="text"
            value={props.config.titreWidget || ''}
            onChange={(e) => onFieldChange('titreWidget', e.target.value)}
            placeholder="Ex: Zonage - Historique"
            css={{ width: '100%' }}
          />
        </SettingRow>
      </SettingSection>

      <SettingSection title="3. Champ Date de début :">
        <SettingRow>
          <Select value={props.config.fieldStart || ''} onChange={(e) => onFieldChange('fieldStart', e.target.value)} css={{ width: '100%' }}>
            {schemaFields.length === 0 && <Option value={props.config.fieldStart}>{props.config.fieldStart}</Option>}
            {schemaFields.map(f => <Option key={f.name} value={f.name}>{f.alias || f.name}</Option>)}
          </Select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="4. Champ Date de fin :">
        <SettingRow>
          <Select value={props.config.fieldEnd || ''} onChange={(e) => onFieldChange('fieldEnd', e.target.value)} css={{ width: '100%' }}>
            {schemaFields.length === 0 && <Option value={props.config.fieldEnd}>{props.config.fieldEnd}</Option>}
            {schemaFields.map(f => <Option key={f.name} value={f.name}>{f.alias || f.name}</Option>)}
          </Select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="5. Champ Historique Plages (Optionnel) :">
        <SettingRow>
          <Select value={props.config.fieldHistoriquePlages || ''} onChange={(e) => onFieldChange('fieldHistoriquePlages', e.target.value)} css={{ width: '100%' }}>
            <Option value="">-- Aucun --</Option>
            {schemaFields.map(f => <Option key={f.name} value={f.name}>{f.alias || f.name}</Option>)}
          </Select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="6. Champ Concat Règlement (Optionnel) :">
        <SettingRow>
          <Select value={props.config.fieldConcatReglement || ''} onChange={(e) => onFieldChange('fieldConcatReglement', e.target.value)} css={{ width: '100%' }}>
            <Option value="">-- Aucun --</Option>
            {schemaFields.map(f => <Option key={f.name} value={f.name}>{f.alias || f.name}</Option>)}
          </Select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="7. Champ Identifiant de Zone (Zoom) :">
        <SettingRow>
          <Select value={props.config.fieldZonage || ''} onChange={(e) => onFieldChange('fieldZonage', e.target.value)} css={{ width: '100%' }}>
            <Option value="">-- Aucun --</Option>
            {schemaFields.map(f => <Option key={f.name} value={f.name}>{f.alias || f.name}</Option>)}
          </Select>
        </SettingRow>
      </SettingSection>

      <SettingSection title="8. Options d'exportation :">
        <SettingRow>
          <div css={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span css={{ fontSize: '13px' }}>Boutons d'export (CSV, GeoJSON)</span>
            <Switch 
              checked={props.config.activerExport || false}
              onChange={(e) => onFieldChange('activerExport', e.target.checked)}
            />
          </div>
        </SettingRow>
      </SettingSection>
    </div>
  );
};

export default Setting;
