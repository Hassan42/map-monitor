import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { addChannelWatch, getChannelWatches } from '../api/channels'
import type { ChannelWatch } from '../api/channels'
import { formOverlayClass, formClass, formTitleClass, formFieldClass, formInputClass, formPrimaryButtonClass, formSecondaryButtonClass, formErrorClass } from '../styles/formStyles'

// watch a public Telegram channel: its new posts are read and added to the map's draft as events
function AddChannel({ mapId, onClose }: { mapId: string; onClose: () => void }) {
  const [channel, setChannel] = useState('')
  const [watches, setWatches] = useState<ChannelWatch[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // the channels this map already watches
  useEffect(() => {
    getChannelWatches(mapId).then(setWatches).catch(() => {})
  }, [mapId])

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const added = await addChannelWatch(mapId, channel)
      setWatches((prev) => [...prev, added])
      setChannel('')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(message.includes('409') ? 'This map already watches that channel'
        : message.includes('400') ? 'Not a Telegram channel link or name'
        : 'Could not add the channel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={formOverlayClass}>
      <form onSubmit={handleSubmit} className={formClass}>
        <h2 className={formTitleClass}>Watch a Telegram channel</h2>
        <p className="text-sm text-gray-400">
          New posts from a public channel are read and added to this map's draft as events. You review them before publishing.
        </p>
        <div className={formFieldClass}>
          <label htmlFor="tg-channel">Channel:</label>
          <input
            id="tg-channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="t.me/channel or @channel"
            required
            autoFocus
            className={formInputClass}
          />
        </div>
        {error && <p className={formErrorClass}>{error}</p>}

        {watches.length > 0 && (
          <div className={formFieldClass}>
            <span>Watching:</span>
            <ul className="flex flex-col gap-1">
              {watches.map((w) => (
                <li key={w.id} className="text-gray-200">
                  @{w.channel} {!w.active && <span className="text-xs text-gray-500">(paused)</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={saving || !channel.trim()} className={formPrimaryButtonClass}>
            {saving ? 'Adding...' : 'Add'}
          </button>
          <button type="button" onClick={onClose} className={formSecondaryButtonClass}>
            Close
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddChannel
