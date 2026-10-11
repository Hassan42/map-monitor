// shared look for the add-territory / add-faction / add-event dialogs, matching the dark nav + amber accent

export const formOverlayClass = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/60'

// color-scheme dark also makes the browser-drawn parts (select dropdown list) dark
export const formClass =
    'flex flex-col gap-4 w-80 p-5 bg-neutral-900 text-gray-300 shadow-xl ring-1 ring-white/10 [color-scheme:dark]'

export const formTitleClass = 'text-lg font-semibold text-white'

export const formFieldClass = 'flex flex-col gap-1 text-sm'

export const formInputClass =
    'bg-neutral-800 border border-neutral-700 px-2 py-1.5 text-gray-100 ' +
    'focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400'

export const formColorInputClass =
    'h-10 w-full bg-neutral-800 border border-neutral-700 p-1 cursor-pointer'

export const formPrimaryButtonClass =
    'flex-1 bg-amber-400 px-3 py-1.5 font-medium text-neutral-900 transition-colors ' +
    'hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed'

export const formSecondaryButtonClass =
    'flex-1 bg-neutral-700 px-3 py-1.5 text-gray-200 transition-colors hover:bg-neutral-600'

export const formErrorClass = 'text-sm text-red-400'
