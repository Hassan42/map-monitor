import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { createLayer, getMapLayers, importLayers } from '../api/layer'
import type { Layer } from '../types/types'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'
import NavDropdown from './NavDropDown'
import { creditText } from '../map/layerCredit'

function mapIdFromLink(text: string): string | null {
    const match = text.trim().match(/(?:\/maps\/)?(\d+)\/?(?:[?#].*)?$/)
    return match ? match[1] : null
}

function AddLayer({ mapId, onCreated, onClose, onImported }: { mapId: string; onCreated: (layer: Layer) => void; onClose: () => void; onImported: () => void }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [importLayer, setImportLayer] = useState(true)
    const [fetchedLayers, setFetchedLayers] = useState<Layer[]>([])
    const [importedLayerLink, setImportedLayerLink] = useState('')
    const [selectedLayersIds, setSelectedLayersIds] = useState<Set<number>>(new Set())

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        if (!title.trim()) return setError('Give the layer a title')
        setError('')
        setLoading(true)
        try {
            const layer = await createLayer(mapId, { title: title.trim(), description })
            onCreated(layer)
        } catch {
            setError('Could not create layer')
        } finally {
            setLoading(false)
        }
    }

    const handleImportSubmit = async (e: SubmitEvent) => {
        e.preventDefault()
        if (selectedLayersIds.size === 0) return setError('Select at least one layer to import')
        setError('')
        setLoading(true)

        const importedMapId = mapIdFromLink(importedLayerLink)
        if (!importedMapId) {
            setError('Invalid map link')
            setLoading(false)
            return
        }

        importLayers(mapId, importedMapId, Array.from(selectedLayersIds))
            .then(() => onImported())
            .catch(() => {
                setError('Could not import layers')
            }).finally(() => {
                setLoading(false)
            })
    }


    useEffect(() => {
        if (importLayer && importedLayerLink) {
            const mapId = mapIdFromLink(importedLayerLink)
            if (!mapId) {
                setError('Invalid map link')
                return
            }
            setError('')
            getMapLayers(mapId, false).then(setFetchedLayers)
                .catch(() => setError("Couldn't load that map's layers"))

        }
    }, [importLayer, importedLayerLink])



    return (
        <div className={formOverlayClass}>
            <form onSubmit={importLayer ? handleImportSubmit : handleSubmit} className={formClass}>
                <h2 className={formTitleClass}>
                    <button type="button" onClick={() => setImportLayer(false)} className="active:text-accent-300 underline">
                        New Layer
                    </button>{' '}
                    or{' '}
                    <button type="button" onClick={() => setImportLayer(true)} className="active:text-accent-300 underline">
                        Import Layer
                    </button>
                </h2>

                {importLayer && (
                    <>
                        <p className="text-sm text-gray-400">Importing an existing layer from a different map. Original layer author will be credited.</p>
                        <div className={formFieldClass}>
                            <label htmlFor="layer-title">Map Link:</label>
                            <input type="text" id="layer-title" value={importedLayerLink} onChange={(e) => setImportedLayerLink(e.target.value)} className={formInputClass} placeholder="https://mapmonitor.com/maps/12345" />
                            <NavDropdown label="layers" ariaLabel="importing a layer" title="Select which layer to import" align="right">
                                <div className="flex flex-col gap-2 p-2">
                                    {fetchedLayers.length === 0 && <p className="text-sm text-gray-400">No layers found</p>}
                                    {fetchedLayers.map((layer) => (
                                        <button key={layer.id} type="button" onClick={() => { setSelectedLayersIds((prev) => new Set([...prev, layer.id])); }} className="text-left text-sm text-gray-400 hover:text-accent-300">
                                            {layer.title}
                                            {layer.credit && <span className="block text-xs text-gray-500">{creditText(layer.credit)}</span>}
                                        </button>
                                    ))}
                                </div>
                            </NavDropdown>
                            {selectedLayersIds.size > 0 && (
                                <div className="flex flex-col gap-1 mt-2">
                                    <p className="text-sm text-gray-400">Selected layers:</p>
                                    {fetchedLayers.filter((layer) => selectedLayersIds.has(layer.id)).map((layer) => (
                                        <div key={layer.id} className="flex items-center gap-2">
                                            <span className="text-sm text-gray-400">{layer.title}</span>
                                            <button type="button" onClick={() => { setSelectedLayersIds((prev) => { const newSet = new Set(prev); newSet.delete(layer.id); return newSet; }); }} className="text-sm text-red-400 hover:text-red-300">
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {!importLayer && (
                    <>
                        <p className="text-sm text-gray-400">Creating a new layer from scratch.</p>
                        <div className={formFieldClass}>
                            <label htmlFor="layer-title">Title:</label>
                            <input type="text" id="layer-title" value={title} onChange={(e) => setTitle(e.target.value)} className={formInputClass} />
                        </div>
                        <div className={formFieldClass}>
                            <label htmlFor="layer-description">Description (optional):</label>
                            <input type="text" id="layer-description" value={description} onChange={(e) => setDescription(e.target.value)} className={formInputClass} />
                        </div>
                    </>
                )}

                {error && <p className={formErrorClass}>{error}</p>}
                <div className="flex gap-2">
                    <button type="submit" disabled={loading} className={formPrimaryButtonClass}>
                        {loading ? 'Adding...' : importLayer ? 'Import Layers' : 'Add Layer'}
                    </button>
                    <button type="button" onClick={onClose} className={formSecondaryButtonClass}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddLayer
