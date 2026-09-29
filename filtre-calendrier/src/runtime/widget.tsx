/** @jsx jsx */
import { React, jsx, AllWidgetProps, DataSourceComponent, QueriableDataSource, SqlQueryParams, SessionManager } from 'jimu-core';
import { Button } from 'jimu-ui';
import { IMConfig } from '../config';

const Widget = (props: AllWidgetProps<IMConfig>) => {
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [ds, setDs] = React.useState<QueriableDataSource>(null);
  const [reglementData, setReglementData] = React.useState<any>(null);

  const fieldStart = props.config?.fieldStart || 'time_start';
  const fieldEnd = props.config?.fieldEnd || 'time_end';
  const titreWidget = props.config?.titreWidget || '';

  const parseReglementInfo = (strHist: string, strConcat: string, selDate: string) => {
    if (!strHist || !strConcat || !selDate) return null;
    
    const selInt = parseInt(selDate.replace(/-/g, ''), 10);
    
    let activeReg = null;
    const plages = strHist.split('|').map(s => s.trim());
    for (const p of plages) {
      const match = p.match(/(.+?):\s*(\d{8})\s*au\s*(\d{8})/);
      if (match) {
        const reg = match[1].trim();
        const start = parseInt(match[2], 10);
        const end = parseInt(match[3], 10);
        if (selInt >= start && selInt <= end) {
          activeReg = reg;
          break;
        }
      }
    }
    
    if (!activeReg) return { info: "Aucun règlement actif trouvé pour cette date spécifique." };
    
    const regBlocks = strConcat.split(/(?=reg:\{)/).map(s => s.trim()).filter(s => s.length > 0);
    const regInfos = regBlocks.map(block => {
      const getVal = (key: string) => {
        const regex = new RegExp(`${key}:\\s*\\{(.*?)\\}`);
        const match = block.match(regex);
        return match ? match[1].trim() : '';
      };
      return {
        reg: getVal('reg'),
        date_eev: getVal('date_eev'),
        modif_limite: getVal('modif_limite').toLowerCase(),
        z_ajo: getVal('z_ajo'),
        z_sup: getVal('z_sup'),
        z_aju: getVal('z_aju')
      };
    });
    
    const currentIndex = regInfos.findIndex(r => r.reg === activeReg);
    if (currentIndex === -1) return { info: `Règlement ${activeReg} introuvable dans les métadonnées.` };
    
    let currentReg = regInfos[currentIndex];
    let lastModifReg = null;
    
    if (currentReg.modif_limite === 'non') {
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (regInfos[i].modif_limite === 'oui') {
          lastModifReg = regInfos[i];
          break;
        }
      }
    }
    
    const formatDate = (d: string) => (d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d);
    const parseZones = (zStr: string) => {
      if (!zStr || zStr === '' || zStr.toLowerCase() === 'aucune') return [];
      return zStr.split(';').map(s => s.trim()).filter(s => s.length > 0);
    };
    
    const sourceReg = lastModifReg || currentReg;

    return {
      reg_actif: currentReg.reg,
      date_eev_actif: formatDate(currentReg.date_eev),
      reg_modif: lastModifReg ? lastModifReg.reg : null,
      z_ajo: parseZones(sourceReg.z_ajo),
      z_sup: parseZones(sourceReg.z_sup),
      z_aju: parseZones(sourceReg.z_aju)
    };
  };

  const appliquerFiltre = () => {
    setReglementData(null);
    if (!ds || !selectedDate) return;

    const schema = ds.getSchema();
    if (!schema || !schema.fields) return;

    const startFieldDef = Object.values(schema.fields).find(f => f.name.toLowerCase() === fieldStart.toLowerCase());
    const endFieldDef = Object.values(schema.fields).find(f => f.name.toLowerCase() === fieldEnd.toLowerCase());
    if (!startFieldDef || !endFieldDef) return;

    const realStartName = startFieldDef.name;
    const realEndName = endFieldDef.name;
    const isDate = (startFieldDef.type || '').toLowerCase().includes('date');

    let requeteSQL = '';
    if (isDate) {
      requeteSQL = `${realStartName} <= DATE '${selectedDate}' AND (${realEndName} >= DATE '${selectedDate}' OR ${realEndName} IS NULL)`;
    } else {
      requeteSQL = `${realStartName} <= '${selectedDate}' AND (${realEndName} >= '${selectedDate}' OR ${realEndName} IS NULL)`;
    }

    ds.updateQueryParams({ where: requeteSQL }, props.id);

    const histField = props.config.fieldHistoriquePlages;
    const concatField = props.config.fieldConcatReglement;
    
    if (histField && concatField) {
      ds.query({ where: '1=1', outFields: [histField, concatField], returnGeometry: false, pageSize: 1 })
        .then(res => {
          if (res?.records?.length > 0) {
            const attrs = res.records[0].getData();
            setReglementData(parseReglementInfo(attrs[histField] || '', attrs[concatField] || '', selectedDate));
          }
        }).catch(err => console.error("Erreur de lecture des métadonnées :", err));
    }
  };

  const effacerFiltre = () => {
    setReglementData(null);
    if (ds) {
      ds.updateQueryParams({ where: '1=1' }, props.id);
      setSelectedDate('');
    }
  };

  const handleZoneClick = (e: React.MouseEvent, zoneName: string) => {
    e.preventDefault();
    if (!ds || !props.config.fieldZonage) return;
    
    ds.query({
      where: `${props.config.fieldZonage} = '${zoneName}'`,
      outFields: [ds.getIdField()],
      returnGeometry: false
    }).then(res => {
      if (res && res.records && res.records.length > 0) {
        const ids = res.records.map(r => r.getId());
        ds.selectRecordsByIds(ids);
      }
    });
  };

  const renderZoneList = (zones: string[]) => {
    if (!zones || zones.length === 0) return "Aucune";
    
    if (!props.config.fieldZonage) {
      return zones.join(', ');
    }

    return (
      <span>
        {zones.map((z, idx) => (
          <React.Fragment key={z}>
            <a 
              href="#" 
              onClick={(e) => handleZoneClick(e, z)}
              css={{ color: '#005e99', textDecoration: 'none', fontWeight: 'bold', ':hover': { textDecoration: 'underline', color: '#003d66' } }}
              title="Cliquer pour sélectionner sur la carte"
            >
              {z}
            </a>
            {idx < zones.length - 1 ? ', ' : ''}
          </React.Fragment>
        ))}
      </span>
    );
  };

  // ----- LOGIQUE D'EXPORTATION -----
  const getExportFileName = (extension: string) => {
    const selDate = selectedDate ? selectedDate.replace(/-/g, '') : 'aucune';
    const today = new Date();
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    return `vue_temporelle_zonage_${selDate}_${todayStr}.${extension}`;
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = async () => {
    if (!ds) return;
    const where = ds.getCurrentQueryParams()?.where || '1=1';
    ds.query({ where, returnGeometry: false, outFields: ['*'] }).then(res => {
      if (!res?.records || res.records.length === 0) {
        alert("Aucune donnée à exporter.");
        return;
      }
      const features = res.records.map(r => r.getData());
      const headers = Object.keys(features[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of features) {
        const values = headers.map(header => `"${('' + (row[header] ?? '')).replace(/"/g, '""')}"`);
        csvRows.push(values.join(','));
      }
      downloadFile(csvRows.join('\n'), getExportFileName('csv'), 'text/csv');
    });
  };

  const exportGeoJSON = async () => {
    if (!ds) return;
    const where = ds.getCurrentQueryParams()?.where || '1=1';
    
    try {
      // Utilisation de ds.query avec le système de coordonnées local demandé (WKID 2949 - MTM 7)
      const res = await ds.query({ 
        where, 
        returnGeometry: true, 
        outFields: ['*'],
        outSpatialReference: { wkid: 2949 } as any
      });
      
      if (!res?.records || res.records.length === 0) {
        alert("Aucune donnée à exporter.");
        return;
      }
      
      const features = res.records.map(r => {
        const data = r.getData();
        const feature = (r as any).feature;
        const geom = feature ? feature.geometry : null;
        
        let geoJsonGeom = null;
        if (geom) {
          if (geom.rings) {
            geoJsonGeom = { type: "Polygon", coordinates: geom.rings };
          } else if (geom.paths) {
            geoJsonGeom = { type: "MultiLineString", coordinates: geom.paths };
          } else if (geom.x !== undefined) {
            geoJsonGeom = { type: "Point", coordinates: [geom.x, geom.y] };
          }
        }
        
        return {
          type: "Feature",
          properties: data,
          geometry: geoJsonGeom
        };
      });
      
      const geojson = {
        type: "FeatureCollection",
        crs: {
          type: "name",
          properties: {
            name: "urn:ogc:def:crs:EPSG::2949"
          }
        },
        features: features
      };
      
      downloadFile(JSON.stringify(geojson), getExportFileName('geojson'), 'application/geo+json');
    } catch (e) {
      alert("Erreur lors de l'export GeoJSON.");
      console.error(e);
    }
  };

  return (
    <div className="widget-filtre-calendrier" css={{ padding: '15px', backgroundColor: 'white', borderRadius: '5px' }}>
      
      {props.useDataSources && props.useDataSources.length > 0 && (
        <DataSourceComponent
          useDataSource={props.useDataSources[0]}
          query={null}
          widgetId={props.id}
          onDataSourceCreated={(loadedDs) => setDs(loadedDs as QueriableDataSource)}
        />
      )}

      {titreWidget && (
        <div css={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '12px', color: 'black', borderBottom: '2px solid #005e99', paddingBottom: '5px' }}>
          {titreWidget}
        </div>
      )}

      <label htmlFor={`date-input-${props.id}`} css={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
        Date recherchée :
      </label>
      
      <input 
        id={`date-input-${props.id}`}
        type="date" 
        style={{ width: '100%', padding: '6px', marginBottom: '12px', border: '1px solid #ccc', borderRadius: '4px' }}
        value={selectedDate}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)} 
      />
      
      <div css={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" onClick={appliquerFiltre}>Filtrer</Button>
        <Button onClick={effacerFiltre}>Effacer</Button>
      </div>

      {reglementData && (
        <div css={{ marginTop: '15px', padding: '12px', backgroundColor: '#f9f9f9', borderLeft: '4px solid #005e99', borderRadius: '0 4px 4px 0', fontSize: '12px', lineHeight: '1.5' }}>
          {reglementData.info ? (
            <p css={{ margin: 0, fontStyle: 'italic', color: '#666' }}>{reglementData.info}</p>
          ) : (
            <React.Fragment>
              <div css={{ marginBottom: '6px' }}>
                <strong css={{ color: '#333' }}>Règlement en vigueur :</strong> <span css={{ color: '#005e99', fontWeight: 'bold', fontSize: '14px' }}>{reglementData.reg_actif}</span>
                <span css={{ color: '#666', fontSize: '11px', marginLeft: '6px' }}>(depuis le {reglementData.date_eev_actif})</span>
              </div>
              
              {reglementData.reg_modif && (
                <div css={{ marginBottom: '8px', fontStyle: 'italic', color: '#d97706', fontSize: '11px', paddingBottom: '6px', borderBottom: '1px dashed #ccc' }}>
                  * Dernière modification de limites : <strong>{reglementData.reg_modif}</strong>
                </div>
              )}
              
              <div css={{ marginBottom: '6px', marginTop: reglementData.reg_modif ? '0' : '8px' }}><strong css={{ color: '#333' }}>Zones ajoutées :</strong> {renderZoneList(reglementData.z_ajo)}</div>
              <div css={{ marginBottom: '6px' }}><strong css={{ color: '#333' }}>Zones supprimées :</strong> {renderZoneList(reglementData.z_sup)}</div>
              <div css={{ marginBottom: 0 }}><strong css={{ color: '#333' }}>Zones ajustées :</strong> {renderZoneList(reglementData.z_aju)}</div>
            </React.Fragment>
          )}
        </div>
      )}

      {/* Section Exportation */}
      {props.config.activerExport && (
        <div css={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
          <div css={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>Exporter les données filtrées :</div>
          <div css={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button size="sm" type="default" onClick={exportCSV} title="Télécharger en tableau CSV">
              CSV
            </Button>
            <Button size="sm" type="default" onClick={exportGeoJSON} title="Télécharger avec la géométrie (GeoJSON)">
              GeoJSON
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Widget;
