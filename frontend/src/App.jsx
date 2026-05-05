import { useEffect, useMemo, useRef, useState } from 'react'
import {
	BrowserRouter,
	Link,
	NavLink,
	Navigate,
	Route,
	Routes,
	useNavigate,
	useLocation,
	useSearchParams,
	useParams,
} from 'react-router-dom'
import Swal from 'sweetalert2'
import { api } from './api'

const ROLE_DEFAULT_PATH = {
	student: '/student/dashboard',
	director: '/director/dashboard',
	reception: '/reception/students',
	teacher: '/teacher/attendance',
}

const NAV_ITEMS = {
	student: [
		{ to: '/student/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ to: '/student/attendance', label: 'Davomat', icon: 'event_available' },
		{ to: '/student/payments', label: "To'lovlar", icon: 'payments' },
		{ to: '/student/schedule', label: 'Jadval', icon: 'calendar_month' },
		{ to: '/student/notifications', label: 'Bildirishnomalar', icon: 'notifications' },
		{ to: '/student/profile', label: 'Profil', icon: 'person' },
	],
	director: [
		{ to: '/director/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ to: '/director/students', label: "O'quvchilar", icon: 'group' },
		{ to: '/director/payments', label: "To'lovlar", icon: 'payments' },
		{ to: '/director/attendance', label: 'Davomat', icon: 'event_available' },
		{ to: '/director/statistics', label: 'Statistika', icon: 'leaderboard' },
		{ to: '/director/settings', label: 'Sozlamalar', icon: 'settings' },
	],
	reception: [
		{ to: '/reception/dashboard', label: 'Bosh sahifa', icon: 'dashboard' },
		{ to: '/reception/students', label: "O'quvchilar", icon: 'group' },
		{ to: '/reception/payments', label: "To'lovlar", icon: 'payments' },
		{ to: '/reception/requests', label: "Bog'lanish", icon: 'support_agent' },
		{ to: '/reception/attendance', label: 'Davomat', icon: 'event_available' },
		{ to: '/reception/settings', label: 'Sozlamalar', icon: 'settings' },
	],
	teacher: [
		{ to: '/teacher/dashboard', label: 'Dashboard', icon: 'dashboard' },
		{ to: '/teacher/attendance', label: 'Davomat', icon: 'event_available' },
		{ to: '/teacher/groups', label: 'Guruhlarim', icon: 'group' },
		{ to: '/teacher/statistics', label: 'Statistika', icon: 'leaderboard' },
		{ to: '/teacher/settings', label: 'Sozlamalar', icon: 'settings' },
	],
}

const LANDING_COURSES = [
	'Ingliz tili',
	'Nemis tili',
	'Rus tili',
	'Arab tili',
	'Matematika',
	'Kimyo',
	'Biologiya',
	'Dasturlash Frontend',
	'Dasturlash Backend',
	'Ona tili va adabiyot',
]

const LANDING_SHOWCASE = [
	{
		title: 'IELTS & Chet Tillari',
		description:
			'Speaking, grammar, vocabulary va international exam tayyorlovni natijaga yo‘naltirilgan formatda olib boramiz.',
		meta: 'IELTS Intensive · Ingliz · Nemis · Rus · Arab',
		icon: 'translate',
	},
	{
		title: 'Aniq Fanlar',
		description:
			'Matematika, kimyo va biologiya fanlarida fundamental baza va imtihon strategiyasini birga quramiz.',
		meta: 'Matematika · Kimyo · Biologiya',
		icon: 'functions',
	},
	{
		title: 'IT Yo‘nalishlari',
		description:
			'Frontend va backend dasturlash bo‘yicha amaliy loyihalar, portfolio va ishga tayyorlash tizimi bilan.',
		meta: 'Frontend · Backend · Real project workflow',
		icon: 'code',
	},
]

const LANDING_TESTIMONIALS = [
	{
		name: 'Shahzoda R.',
		role: 'IELTS student',
		quote:
			'Intelligent ichida nazorat kuchli. Dars, davomat va payment holati aniq bo‘lgani uchun o‘qish jarayoni ancha tartibli bo‘ldi.',
	},
	{
		name: 'Azamat K.',
		role: 'Frontend student',
		quote:
			'Ustozlar bilan ishlash, jadvalning aniq yuritilishi va topshiriqlar nazorati menga intizom berdi. Natijada real portfolio yig‘dim.',
	},
	{
		name: 'Dilafruz O.',
		role: 'Ota-ona fikri',
		quote:
			'Markaz ichidagi tizim shaffof. Farzandimning holatini, davomati va to‘lovlarini nazorat qilish ancha oson bo‘ldi.',
	},
]

const LANDING_FAQS = [
	{
		question: "Qaysi yo'nalishlar mavjud?",
		answer:
			"Ingliz, nemis, rus, arab tili, matematika, kimyo, biologiya, frontend, backend va ona tili-adabiyot yo'nalishlari mavjud.",
	},
	{
		question: "Student kabinet orqali nimalarni ko'rish mumkin?",
		answer:
			"Student kabinet ichida jadval, davomat, to'lovlar, bildirishnomalar va shaxsiy profil ma'lumotlarini ko'rish mumkin.",
	},
	{
		question: "Sinov dars tizimi qanday ishlaydi?",
		answer:
			"Yangi student 3 ta o'qish kuni sinov holatida yuradi. Shu muddatdan keyin tizim avtomatik ravishda faol yoki qarzdor holatni belgilaydi.",
	},
]

const LANDING_COURSE_SPOTLIGHTS = [
	{
		title: 'Chet tillari',
		subtitle: 'Ingliz, nemis, rus va arab tili',
		meta: 'IELTS, CEFR va speaking practice bilan',
		icon: 'translate',
	},
	{
		title: 'Aniq fanlar',
		subtitle: 'Matematika, kimyo va biologiya',
		meta: 'Fundamental baza va imtihon tayyorlov',
		icon: 'functions',
	},
	{
		title: 'Dasturlash',
		subtitle: 'Frontend va backend yo‘nalishlari',
		meta: 'Amaliy loyiha, portfolio va ishga tayyorlov',
		icon: 'code',
	},
	{
		title: 'Ona tili va adabiyot',
		subtitle: 'Nazariya va test strategiyasi',
		meta: 'Abituriyentlar uchun tartibli tayyorlov',
		icon: 'menu_book',
	},
]

const LANDING_TRUST_ITEMS = [
	"3 kunlik sinov tizimi va avtomatik status nazorati",
	"Reception orqali real vaqt student va to'lov boshqaruvi",
	"Teacher panelida davomat, tarix va guruhlar nazorati",
	"Director uchun tushum, qarzdorlik va kurslar analytics'i",
]

const LANDING_SHOWCASE_CLEAN = [
	{
		title: 'IELTS & Chet tillari',
		description:
			"Speaking, grammar, vocabulary va xalqaro imtihon tayyorlovini natijaga yo'naltirilgan formatda olib boramiz.",
		meta: "IELTS Intensive · Ingliz · Nemis · Rus · Arab",
		icon: 'translate',
	},
	{
		title: 'Aniq fanlar',
		description:
			"Matematika, kimyo va biologiya fanlarida fundamental baza va imtihon strategiyasini birga quramiz.",
		meta: 'Matematika · Kimyo · Biologiya',
		icon: 'functions',
	},
	{
		title: 'IT yo‘nalishlari',
		description:
			"Frontend va backend dasturlash bo'yicha amaliy loyihalar, portfolio va ishga tayyorlash tizimi bilan.",
		meta: 'Frontend · Backend · Real project workflow',
		icon: 'code',
	},
]

const LANDING_SHOWCASE_RICH = [
	{
		title: 'IELTS & Chet tillari',
		description:
			"Speaking, grammar, vocabulary va xalqaro imtihon tayyorlovini natijaga yo'naltirilgan formatda olib boramiz.",
		meta: 'IELTS Intensive · Ingliz · Nemis · Rus · Arab',
		result: '7.0+ IELTS fokus',
		forWho:
			"Abituriyentlar, ishchi yoshlar va speaking kuchaytirmoqchi bo'lganlar uchun",
		outcome:
			'Speaking confidence, vocabulary growth va xalqaro imtihon tayyorligi',
		gradient: 'linear-gradient(135deg, #0f2e78 0%, #2b63ea 100%)',
		icon: 'translate',
	},
	{
		title: 'Aniq fanlar',
		description:
			"Matematika, kimyo va biologiya fanlarida fundamental baza va imtihon strategiyasini birga quramiz.",
		meta: 'Matematika · Kimyo · Biologiya',
		result: 'DTM va foundation tayyorlov',
		forWho:
			"Matematika va tabiiy fanlardan kuchli baza qurmoqchi bo'lgan o'quvchilar uchun",
		outcome:
			'Mavzularni tushunish, test ishlash tezligi va kuchli nazariy baza',
		gradient: 'linear-gradient(135deg, #16533d 0%, #22a06b 100%)',
		icon: 'functions',
	},
	{
		title: 'IT yo‘nalishlari',
		description:
			"Frontend va backend dasturlash bo'yicha amaliy loyihalar, portfolio va ishga tayyorlash tizimi bilan.",
		meta: 'Frontend · Backend · Real project workflow',
		result: 'Portfolio va real project',
		forWho:
			"IT'ga kirmoqchi bo'lgan yangi boshlovchilar va skill oshirmoqchi bo'lganlar uchun",
		outcome:
			'Real loyiha tajribasi, portfolio va ishga yaqin kompetensiya',
		gradient: 'linear-gradient(135deg, #4b1f86 0%, #7c3aed 100%)',
		icon: 'code',
	},
]

const LANDING_TESTIMONIALS_CLEAN = [
	{
		name: 'Shahzoda R.',
		role: 'IELTS student',
		outcome: '7.0 IELTS natija',
		avatar: '/testimonial-shahzoda.svg',
		quote:
			"Intelligent ichida nazorat kuchli. Dars, davomat va to'lov holati aniq bo'lgani uchun o'qish jarayoni ancha tartibli bo'ldi.",
	},
	{
		name: 'Azamat K.',
		role: 'Frontend student',
		outcome: 'Portfolio va freelance start',
		avatar: '/testimonial-azamat.svg',
		quote:
			"Ustozlar bilan ishlash, jadvalning aniq yuritilishi va topshiriqlar nazorati menga intizom berdi. Natijada real portfolio yig'dim.",
	},
	{
		name: 'Dilafruz O.',
		role: 'Ota-ona fikri',
		outcome: "Shaffof nazorat va aloqa",
		avatar: '/testimonial-dilafruz.svg',
		quote:
			"Markaz ichidagi tizim shaffof. Farzandimning holatini, davomati va to'lovlarini nazorat qilish ancha oson bo'ldi.",
	},
]

const LANDING_GALLERY = [
	{
		title: 'Director paneli',
		description: 'Tushum, qarzdorlik va markaz bo‘yicha real vaqt analytics.',
		image: '/landing-dashboard.png',
	},
	{
		title: 'Reception paneli',
		description: "Student qo'shish, kurs biriktirish va to'lov qabul qilish.",
		image: '/reception-panel.png',
	},
	{
		title: "O'qituvchi paneli",
		description: 'Davomat, guruhlar va kundalik nazorat jarayoni.',
		image: '/teacher-panel.png',
	},
	{
		title: 'Student kabineti',
		description: 'Balans, jadval, to‘lovlar va bildirishnomalar bir joyda.',
		image: '/student-panel.png',
	},
	{
		title: 'Login tizimi',
		description: 'Tartibli kirish jarayoni va rollar bo‘yicha himoya.',
		image: '/login-panel.png',
	},
]

function CountUp({ end = 0, suffix = '', duration = 1200 }) {
	const [value, setValue] = useState(0)

	useEffect(() => {
		let frame = 0
		const steps = 30
		const increment = end / steps
		const timer = setInterval(() => {
			frame += 1
			if (frame >= steps) {
				setValue(end)
				clearInterval(timer)
				return
			}
			setValue(Math.round(increment * frame))
		}, Math.max(20, Math.floor(duration / steps)))

		return () => clearInterval(timer)
	}, [end, duration])

	return (
		<>
			{value.toLocaleString('ru-RU')}
			{suffix}
		</>
	)
}

function RevealSection({ as: Tag = 'section', className = '', delay = 0, children, ...props }) {
	const ref = useRef(null)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		const node = ref.current
		if (!node) return

		const observer = new IntersectionObserver(
			entries => {
				const [entry] = entries
				if (entry?.isIntersecting) {
					setVisible(true)
					observer.disconnect()
				}
			},
			{ threshold: 0.16 },
		)

		observer.observe(node)
		return () => observer.disconnect()
	}, [])

	return (
		<Tag
			ref={ref}
			className={`reveal-section ${visible ? 'visible' : ''} ${className}`.trim()}
			style={{ '--reveal-delay': `${delay}ms` }}
			{...props}
		>
			{children}
		</Tag>
	)
}

function Icon({ name, className = '' }) {
	return (
		<span className={`material-symbols-outlined ${className}`.trim()}>
			{name}
		</span>
	)
}

function formatMoney(value) {
	return `${Number(value || 0).toLocaleString('ru-RU')} UZS`
}

function getPaymentMethodMeta(method = '') {
	const normalized = String(method || '').trim().toLowerCase()
	if (normalized === 'manual' || normalized === 'cash' || normalized === 'naqd') {
		return {
			label: "Naqd / Qo'lda qabul qilingan",
			shortLabel: 'Naqd',
			icon: 'payments',
		}
	}
	if (normalized === 'click') {
		return {
			label: 'Click',
			shortLabel: 'Click',
			icon: 'touch_app',
		}
	}
	if (normalized === 'payme') {
		return {
			label: 'Payme',
			shortLabel: 'Payme',
			icon: 'account_balance_wallet',
		}
	}
	if (normalized === 'bank' || normalized === 'transfer') {
		return {
			label: "Bank o'tkazmasi",
			shortLabel: 'Bank',
			icon: 'account_balance',
		}
	}
	return {
		label: method || 'Nomaʼlum usul',
		shortLabel: method || 'Nomaʼlum',
		icon: 'credit_card',
	}
}

function formatDateLabel(value = new Date()) {
	return new Intl.DateTimeFormat('uz-UZ', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(value)
}

function formatPhoneInput(value = '') {
	const digits = value.replace(/\D/g, '').slice(0, 12)
	let normalized = digits
	if (normalized.startsWith('998')) {
		normalized = normalized
	} else if (normalized.startsWith('8')) {
		normalized = `99${normalized}`
	} else if (normalized.length) {
		normalized = `998${normalized}`
	}
	const parts = [
		normalized.slice(0, 3),
		normalized.slice(3, 5),
		normalized.slice(5, 8),
		normalized.slice(8, 10),
		normalized.slice(10, 12),
	].filter(Boolean)
	return parts.length ? `+${parts.join(' ')}` : ''
}

function formatRole(user) {
	if (user.role === 'director') return 'DIREKTOR'
	if (user.role === 'reception') return 'ADMINISTRATOR'
	if (user.role === 'teacher') return "O'QITUVCHI"
	return 'XODIM'
}

function getStudentStatusMeta(status) {
	if (status === 'active') return { tone: 'success', label: 'Faol' }
	if (status === 'trial') return { tone: 'warning', label: 'Sinovda' }
	return { tone: 'danger', label: 'Qarzdor' }
}

function getInitials(name = '') {
	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0])
		.join('')
		.toUpperCase()
}

function Badge({ tone = 'default', children }) {
	return <span className={`badge ${tone}`}>{children}</span>
}

function MiniTrendChart({ items = [], valueKey = 'value', labelKey = 'label', tone = 'navy' }) {
	const max = Math.max(...items.map(item => Number(item?.[valueKey] || 0)), 1)
	return (
		<div className={`mini-trend-chart tone-${tone}`}>
			{items.map((item, index) => (
				<div key={`${item?.[labelKey] || index}-${index}`} className='mini-trend-bar'>
					<span
						className='mini-trend-fill'
						style={{
							height: `${Math.max((Number(item?.[valueKey] || 0) / max) * 100, 12)}%`,
						}}
					/>
					<small>{item?.[labelKey]}</small>
				</div>
			))}
		</div>
	)
}

function readFileAsDataUrl(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result)
		reader.onerror = () => reject(new Error('Rasm yuklanmadi'))
		reader.readAsDataURL(file)
	})
}

function downloadTextFile(
	filename,
	content,
	type = 'text/plain;charset=utf-8',
) {
	const blob = new Blob([content], { type })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	link.click()
	URL.revokeObjectURL(url)
}

function downloadBlobFile(filename, blob) {
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	link.click()
	URL.revokeObjectURL(url)
}

function formatPeriodLabel(period = '') {
	if (!period || !period.includes('-')) return period
	const [, month] = period.split('-')
	const months = {
		'01': 'Yanvar',
		'02': 'Fevral',
		'03': 'Mart',
		'04': 'Aprel',
		'05': 'May',
		'06': 'Iyun',
		'07': 'Iyul',
		'08': 'Avgust',
		'09': 'Sentabr',
		'10': 'Oktabr',
		'11': 'Noyabr',
		'12': 'Dekabr',
	}
	return months[month] || period
}

function isDateInRange(value, from, to) {
	if (!value) return true
	if (from && value < from) return false
	if (to && value > to) return false
	return true
}

function getQrPreviewUrl(value) {
	return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(value)}`
}

async function copyText(value) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(value)
		return
	}
	const input = document.createElement('textarea')
	input.value = value
	document.body.appendChild(input)
	input.select()
	document.execCommand('copy')
	document.body.removeChild(input)
}

const toast = Swal.mixin({
	toast: true,
	position: 'top-end',
	showConfirmButton: false,
	timer: 2800,
	timerProgressBar: true,
})

function showError(message) {
	return Swal.fire({
		icon: 'error',
		title: 'Xatolik',
		text: message,
		confirmButtonColor: '#133385',
	})
}

function showSuccess(title, text) {
	return Swal.fire({
		icon: 'success',
		title,
		text,
		confirmButtonColor: '#133385',
	})
}

function Modal({ title, subtitle, onClose, children }) {
	return (
		<div className='modal-backdrop' onClick={onClose}>
			<div className='modal-card' onClick={event => event.stopPropagation()}>
				<div className='modal-head'>
					<div>
						<h3>{title}</h3>
						{subtitle ? <p>{subtitle}</p> : null}
					</div>
					<button type='button' className='close-btn' onClick={onClose}>
						<Icon name='close' />
					</button>
				</div>
				{children}
			</div>
		</div>
	)
}

function ActionButton({
	children,
	secondary = false,
	onClick,
	type = 'button',
	icon,
}) {
	return (
		<button
			type={type}
			className={secondary ? 'action-btn secondary' : 'action-btn'}
			onClick={onClick}
		>
			{icon ? <Icon name={icon} className='button-icon' /> : null}
			{children}
		</button>
	)
}

function PageHeader({ title, subtitle, actions }) {
	return (
		<section className='page-intro'>
			<div>
				<h1>{title}</h1>
				<p>{subtitle}</p>
			</div>
			{actions ? <div className='intro-actions'>{actions}</div> : null}
		</section>
	)
}

function RoleLayout({ user, onLogout, children, token }) {
	const nav = NAV_ITEMS[user.role]
	const panelLabel =
		user.role === 'reception'
			? 'Reception Panel'
			: user.role === 'student'
				? 'Student Panel'
				: 'Education CRM'
	const [notifications, setNotifications] = useState([])
	const [showNotifications, setShowNotifications] = useState(false)
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [searchValue, setSearchValue] = useState('')
	const location = useLocation()
	const navigate = useNavigate()

	useEffect(() => {
		api
			.getNotifications(token)
			.then(setNotifications)
			.catch(() => null)
	}, [token])

	useEffect(() => {
		setSidebarOpen(false)
	}, [location.pathname])

	useEffect(() => {
		const currentSearch =
			new URLSearchParams(location.search).get('search') || ''
		setSearchValue(currentSearch)
	}, [location.pathname, location.search])

	async function handleReadNotification(notificationId) {
		await api.readNotification(token, notificationId)
		setNotifications(items =>
			items.map(item =>
				item.id === notificationId ? { ...item, status: 'read' } : item,
			),
		)
	}

	function handleGlobalSearch(event) {
		event.preventDefault()
		const query = searchValue.trim()
		if (user.role === 'student') {
			navigate('/student/dashboard')
			return
		}
		if (user.role === 'teacher') {
			navigate(
				`/teacher/groups${query ? `?search=${encodeURIComponent(query)}` : ''}`,
			)
			return
		}
		const basePath =
			user.role === 'director' ? '/director/students' : '/reception/students'
		navigate(
			`${basePath}${query ? `?search=${encodeURIComponent(query)}` : ''}`,
		)
	}

	return (
		<div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
			{sidebarOpen ? (
				<button
					type='button'
					className='sidebar-overlay'
					onClick={() => setSidebarOpen(false)}
				/>
			) : null}
			<aside className='sidebar'>
				<div className='sidebar-inner'>
					<div className='sidebar-brand'>
						<div className='brand-logo'>
							<Icon name='school' />
						</div>
						<div>
							<strong>Intelligent</strong>
							<p>{panelLabel}</p>
						</div>
					</div>

					<nav className='sidebar-nav'>
						{nav.map(item => (
							<NavLink
								key={item.to}
								to={item.to}
								className={({ isActive }) =>
									isActive ? 'sidebar-link active' : 'sidebar-link'
								}
							>
								<Icon name={item.icon} className='sidebar-icon' />
								{item.label}
							</NavLink>
						))}
					</nav>
				</div>

				<button type='button' className='sidebar-logout' onClick={onLogout}>
					<Icon name='logout' className='logout-icon' />
					Chiqish
				</button>
			</aside>

			<div className='page-shell'>
				<header className='page-topbar'>
					<button
						type='button'
						className='hamburger-btn'
						onClick={() => setSidebarOpen(value => !value)}
					>
						<Icon name='menu' />
					</button>
					<form className='search-box' onSubmit={handleGlobalSearch}>
						<Icon name='search' className='search-icon' />
						<input
							placeholder="Ism, telefon yoki kurs bo'yicha qidiring..."
							value={searchValue}
							onChange={event => setSearchValue(event.target.value)}
						/>
					</form>

					<div className='topbar-user'>
						<button
							type='button'
							className='topbar-icon'
							onClick={() => setShowNotifications(value => !value)}
						>
							<Icon name='notifications' />
						</button>

						{showNotifications ? (
							<div className='notifications-popover'>
								<div className='notifications-head'>
									<strong>Bildirishnomalar</strong>
								</div>
								<div className='notifications-list'>
									{notifications.length ? (
										notifications.map(item => (
											<button
												key={item.id}
												type='button'
												className={
													item.status === 'read'
														? 'notification-item read'
														: 'notification-item'
												}
												onClick={() => handleReadNotification(item.id)}
											>
												<strong>{item.title}</strong>
												<span>{item.message}</span>
											</button>
										))
									) : (
										<div className='notification-empty'>
											Yangi bildirishnoma yo'q
										</div>
									)}
								</div>
							</div>
						) : null}
						<div className='user-meta'>
							<strong>{user.fullName}</strong>
							<span>{formatRole(user)}</span>
						</div>
						<div className='user-avatar'>
							{user.profileImage ? (
								<img src={user.profileImage} alt={user.fullName} />
							) : (
								getInitials(user.fullName)
							)}
						</div>
					</div>
				</header>

				<main className='page-content'>{children}</main>
			</div>
		</div>
	)
}

function ProfileSettingsCard({
	token,
	meta,
	title = 'Profilni tahrirlash',
	onProfileUpdated,
}) {
	const [selectedFileName, setSelectedFileName] = useState('')
	const [form, setForm] = useState({
		fullName: meta.user.fullName || '',
		username: meta.user.username || '',
		phone: meta.user.phone || '',
		profileImage: meta.user.profileImage || '',
		password: '',
	})
	const [message, setMessage] = useState('')

	async function handleFileChange(event) {
		const file = event.target.files?.[0]
		if (!file) return
		try {
			const dataUrl = await readFileAsDataUrl(file)
			setSelectedFileName(file.name)
			setForm(current => ({ ...current, profileImage: dataUrl }))
		} catch (err) {
			await showError(err.message)
		}
	}

	async function handleSubmit(event) {
		event.preventDefault()
		try {
			const updatedProfile = await api.updateProfile(token, form)
			setMessage('Profil muvaffaqiyatli yangilandi')
			setForm(current => ({ ...current, password: '' }))
			setSelectedFileName('')
			onProfileUpdated?.(updatedProfile)
			await showSuccess('Saqlandi', 'Profil muvaffaqiyatli yangilandi')
		} catch (err) {
			await showError(err.message)
		}
	}

	return (
		<section className='card settings-card'>
			<h3>{title}</h3>
			<form className='modal-form' onSubmit={handleSubmit}>
				<div className='field-grid'>
					<div>
						<label>Ism familiya</label>
						<input
							value={form.fullName}
							onChange={e => setForm({ ...form, fullName: e.target.value })}
						/>
					</div>
					<div>
						<label>Username</label>
						<input
							value={form.username}
							onChange={e => setForm({ ...form, username: e.target.value })}
						/>
					</div>
					<div>
						<label>Telefon</label>
						<input
							value={form.phone}
							onChange={e => setForm({ ...form, phone: e.target.value })}
						/>
					</div>
					<div>
						<label>Profil rasmi</label>
						<label className='file-upload-field'>
							<input type='file' accept='image/*' onChange={handleFileChange} />
							<span className='file-upload-button'>
								<Icon name='upload' className='button-icon' />
								Rasm yuklash
							</span>
							<span className='file-upload-name'>
								{selectedFileName || 'PNG, JPG yoki WEBP fayl tanlang'}
							</span>
						</label>
					</div>
					<div>
						<label>Yangi parol</label>
						<input
							type='password'
							value={form.password}
							onChange={e => setForm({ ...form, password: e.target.value })}
						/>
					</div>
				</div>
				<div className='modal-actions'>
					{message ? <span className='success-text'>{message}</span> : <span />}
					<ActionButton type='submit' icon='save'>
						Saqlash
					</ActionButton>
				</div>
			</form>
		</section>
	)
}

function StudentHistoryModal({ history, onClose }) {
	return (
		<Modal
			title='Student tarixi'
			subtitle="O'quvchi bo'yicha o'zgarishlar"
			onClose={onClose}
		>
			<div className='timeline-list'>
				{history.map(item => (
					<div key={item.id} className='timeline-item'>
						<strong>{item.title}</strong>
						<span>{item.details || item.action}</span>
						<span>{item.createdAt}</span>
					</div>
				))}
			</div>
		</Modal>
	)
}

function CourseModal({ initialData, onClose, onSubmit }) {
	const [form, setForm] = useState(initialData)
	return (
		<Modal
			title={form.id ? 'Kursni tahrirlash' : 'Yangi kurs'}
			subtitle="Kurs ma'lumotlarini kiriting"
			onClose={onClose}
		>
			<form className='modal-form' onSubmit={event => onSubmit(event, form)}>
				<div className='field-grid'>
					<div>
						<label>Nomi</label>
						<input
							value={form.title}
							onChange={e => setForm({ ...form, title: e.target.value })}
						/>
					</div>
					<div>
						<label>Oylik to'lov</label>
						<input
							type='number'
							value={form.monthlyFee}
							onChange={e =>
								setForm({ ...form, monthlyFee: Number(e.target.value) })
							}
						/>
					</div>
					<div>
						<label>Jadval</label>
						<input
							value={form.schedule}
							onChange={e => setForm({ ...form, schedule: e.target.value })}
						/>
					</div>
				</div>
				<div className='modal-actions'>
					<button type='button' className='ghost-outline' onClick={onClose}>
						Bekor qilish
					</button>
					<ActionButton type='submit' icon='save'>
						Saqlash
					</ActionButton>
				</div>
			</form>
		</Modal>
	)
}

function TeacherModal({ initialData, courses, onClose, onSubmit }) {
	const [form, setForm] = useState(initialData)
	return (
		<Modal
			title={form.id ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi"}
			subtitle="O'qituvchi ma'lumotlarini kiriting"
			onClose={onClose}
		>
			<form className='modal-form' onSubmit={event => onSubmit(event, form)}>
				<div className='field-grid'>
					<div>
						<label>Ism familiya</label>
						<input
							value={form.fullName}
							onChange={e => setForm({ ...form, fullName: e.target.value })}
						/>
					</div>
					<div>
						<label>Username</label>
						<input
							value={form.username}
							onChange={e => setForm({ ...form, username: e.target.value })}
						/>
					</div>
					<div>
						<label>Telefon</label>
						<input
							value={form.phone || ''}
							onChange={e => setForm({ ...form, phone: e.target.value })}
						/>
					</div>
					<div>
						<label>Yangi parol</label>
						<input
							type='password'
							value={form.password || ''}
							onChange={e => setForm({ ...form, password: e.target.value })}
						/>
					</div>
					<div className='full-span'>
						<label>O'qitadigan kurslari</label>
						<div className='checkbox-grid'>
							{courses.map(course => {
								const checked = (form.courseIds || []).includes(course.id)
								return (
									<label key={course.id} className='checkbox-card'>
										<input
											type='checkbox'
											checked={checked}
											onChange={e =>
												setForm({
													...form,
													courseIds: e.target.checked
														? [...(form.courseIds || []), course.id]
														: (form.courseIds || []).filter(
																id => id !== course.id,
															),
												})
											}
										/>
										<span>{course.title}</span>
									</label>
								)
							})}
						</div>
					</div>
				</div>
				<div className='modal-actions'>
					<button type='button' className='ghost-outline' onClick={onClose}>
						Bekor qilish
					</button>
					<ActionButton type='submit' icon='save'>
						Saqlash
					</ActionButton>
				</div>
			</form>
		</Modal>
	)
}

function PublicSiteHeader() {
	const [menuOpen, setMenuOpen] = useState(false)
	const [headerProgress, setHeaderProgress] = useState(0)

	useEffect(() => {
		function handleScroll() {
			const next = Math.min(1, window.scrollY / 220)
			setHeaderProgress(next)
		}

		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	return (
		<>
			<header
				className='marketing-header'
				style={{
					'--header-blur': `${8 + headerProgress * 16}px`,
					'--header-bg': `rgba(255, 255, 255, ${0.72 + headerProgress * 0.22})`,
					'--header-border': `rgba(214, 225, 242, ${0.35 + headerProgress * 0.45})`,
					'--header-shadow': `0 ${10 + headerProgress * 12}px ${24 + headerProgress * 18}px rgba(18, 51, 133, ${0.04 + headerProgress * 0.08})`,
				}}
			>
				<Link to='/' className='marketing-brand'>
					<div className='brand-logo'>
						<Icon name='school' />
					</div>
					<div>
						<strong>Intelligent</strong>
						<span>Education Center</span>
					</div>
				</Link>
				<nav className='marketing-nav'>
					<a href='#yonalishlar'>Yo'nalishlar</a>
					<a href='#afzalliklar'>Afzalliklar</a>
					<a href='#aloqa'>Aloqa</a>
				</nav>
				<div className='marketing-actions'>
					<Link to='/student/login' className='marketing-primary-btn'>
						Student kabinet
					</Link>
				</div>
				<button
					type='button'
					className='marketing-menu-btn'
					onClick={() => setMenuOpen(value => !value)}
				>
					<Icon name={menuOpen ? 'close' : 'menu'} />
				</button>
			</header>
			{menuOpen ? (
				<div className='marketing-mobile-menu'>
					<a href='#yonalishlar' onClick={() => setMenuOpen(false)}>
						Yo'nalishlar
					</a>
					<a href='#afzalliklar' onClick={() => setMenuOpen(false)}>
						Afzalliklar
					</a>
					<a href='#aloqa' onClick={() => setMenuOpen(false)}>
						Aloqa
					</a>
					<Link to='/student/login' onClick={() => setMenuOpen(false)}>
						Student kabinet
					</Link>
				</div>
			) : null}
		</>
	)
}

function PublicSiteFooter() {
	return (
		<footer className='marketing-footer' id='aloqa'>
			<div className='marketing-footer-grid'>
				<div>
					<h3>Intelligent</h3>
					<p>
						Zamonaviy o'quv markazi uchun boshqaruv, nazorat va natijaga
						yo'naltirilgan ta'lim ekotizimi.
					</p>
					<div className='footer-socials'>
						<a href='https://t.me/intelligent_support' target='_blank' rel='noreferrer'>
							Telegram
						</a>
						<a href='https://instagram.com/intelligent_edu' target='_blank' rel='noreferrer'>
							Instagram
						</a>
					</div>
				</div>
				<div>
					<h4>Aloqa va manzil</h4>
					<a href='tel:+998901234567'>+998 90 123 45 67</a>
					<span>Andijon viloyati, Qo'rg'ontepa tumani</span>
					<span>Darslar: offline, nazoratli va zamonaviy formatda</span>
					<a href='https://t.me/intelligent_support' target='_blank' rel='noreferrer'>
						Telegram
					</a>
					<a href='https://instagram.com/intelligent_edu' target='_blank' rel='noreferrer'>
						Instagram
					</a>
				</div>
				<div>
					<h4>Foydali linklar</h4>
					<Link to='/student/login'>Student login</Link>
					<Link to='/admins'>Admin login</Link>
					<Link to='/dasturchilar'>Dasturchilar</Link>
				</div>
				<div>
					<h4>Asosiy sahifalar</h4>
					<a href='#yonalishlar'>Yo'nalishlar</a>
					<a href='#afzalliklar'>Afzalliklar</a>
					<a href='#aloqa'>Aloqa</a>
				</div>
			</div>
			<div className='marketing-footer-bottom'>
				<span>© 2026 Intelligent Education CRM</span>
				<Link to='/dasturchilar'>Dasturchilar</Link>
			</div>
		</footer>
	)
}

function HomePage() {
	const [activeFaq, setActiveFaq] = useState(0)
	const [testimonialIndex, setTestimonialIndex] = useState(0)
	const [galleryIndex, setGalleryIndex] = useState(0)
	const [scrollProgress, setScrollProgress] = useState(0)
	const [heroCursor, setHeroCursor] = useState({ x: 50, y: 50, active: false })
	const [contactForm, setContactForm] = useState({
		fullName: '',
		phone: '',
		message: '',
	})
	const touchStartX = useRef(0)

	useEffect(() => {
		const timer = setInterval(() => {
			setTestimonialIndex(current => (current + 1) % LANDING_TESTIMONIALS_CLEAN.length)
		}, 4200)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		const timer = setInterval(() => {
			setGalleryIndex(current => (current + 1) % LANDING_GALLERY.length)
		}, 5200)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		function handleScroll() {
			const max = document.documentElement.scrollHeight - window.innerHeight
			const next = max > 0 ? (window.scrollY / max) * 100 : 0
			setScrollProgress(Math.max(0, Math.min(100, next)))
		}

		handleScroll()
		window.addEventListener('scroll', handleScroll, { passive: true })
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	async function handleContactSubmit(event) {
		event.preventDefault()
		try {
			await api.createContactRequest(contactForm)
			await showSuccess(
				"So'rov qabul qilindi",
				"Tez orada siz bilan bog'lanamiz",
			)
			setContactForm({ fullName: '', phone: '', message: '' })
		} catch (err) {
			await showError(err.message)
		}
	}

	function handleHeroPointerMove(event) {
		const rect = event.currentTarget.getBoundingClientRect()
		const x = ((event.clientX - rect.left) / rect.width) * 100
		const y = ((event.clientY - rect.top) / rect.height) * 100
		setHeroCursor({ x, y, active: true })
	}

	function handleHeroPointerLeave() {
		setHeroCursor({ x: 50, y: 50, active: false })
	}

	function handleTestimonialTouchStart(event) {
		touchStartX.current = event.touches[0]?.clientX || 0
	}

	function handleTestimonialTouchEnd(event) {
		const endX = event.changedTouches[0]?.clientX || 0
		const delta = endX - touchStartX.current
		if (Math.abs(delta) < 42) return
		if (delta < 0) {
			setTestimonialIndex(current => (current + 1) % LANDING_TESTIMONIALS_CLEAN.length)
			return
		}
		setTestimonialIndex(current =>
			current === 0 ? LANDING_TESTIMONIALS_CLEAN.length - 1 : current - 1,
		)
	}

	return (
		<div className='marketing-page'>
			<div className='scroll-progress-bar' style={{ width: `${scrollProgress}%` }} />
			<div className='marketing-parallax parallax-one' style={{ transform: `translate3d(0, ${scrollProgress * 0.45}px, 0)` }} />
			<div className='marketing-parallax parallax-two' style={{ transform: `translate3d(0, ${scrollProgress * -0.3}px, 0)` }} />
			<div
				className='marketing-gradient-shift'
				style={{
					opacity: Math.min(0.82, scrollProgress / 130),
					background: `linear-gradient(180deg, rgba(219,234,254,${0.15 + scrollProgress / 400}) 0%, rgba(239,246,255,${0.08 + scrollProgress / 500}) 30%, rgba(255,255,255,0) 100%)`,
				}}
			/>
			<PublicSiteHeader />
			<main className='marketing-main'>
				<RevealSection className='hero-section' as='section'>
					<div className='hero-copy'>
						<span className='hero-badge'>Premium Education CRM</span>
						<h1>Qo'rg'ontepadagi kuchli o'quv markazi uchun ishonchli raqamli ekotizim</h1>
						<p>
							Intelligent ichida ichki boshqaruv, student kabineti, payment
							nazorati, davomat va tahliliy dashboard bitta premium tizimda
							ishlaydi. Natija, nazorat va ishonch bir sahifada jam bo'ladi.
						</p>
						<div className='hero-actions'>
							<Link to='/student/login' className='marketing-primary-btn'>
								Student kabinet
							</Link>
							<a href='#aloqa' className='marketing-link-btn'>
								Bog'lanish
							</a>
						</div>
						<div className='hero-stats'>
							<div>
								<strong>10+</strong>
								<span>Ta'lim yo'nalishi</span>
							</div>
							<div>
								<strong>3 ta</strong>
								<span>Asosiy panel</span>
							</div>
							<div>
								<strong>24/7</strong>
								<span>Raqamli nazorat</span>
							</div>
						</div>
						<div className='hero-trust-strip'>
							{LANDING_TRUST_ITEMS.map(item => (
								<div key={item} className='hero-trust-chip'>
									<Icon name='check_circle' className='filled-icon' />
									<span>{item}</span>
								</div>
							))}
						</div>
					</div>
					<div className='hero-visual'>
						<div className='hero-panel'>
							<div className='hero-browser-bar'>
								<div className='hero-browser-dots'>
									<span className='window-dot red' />
									<span className='window-dot yellow' />
									<span className='window-dot green' />
								</div>
								<div className='hero-browser-pill'>intelligent.uz/director</div>
							</div>
							<div className='hero-panel-top'>
								<span>Direktor uchun real vaqt analytics</span>
								<Badge tone='success'>Faol tizim</Badge>
							</div>
							<div className='hero-screenshot-frame'>
								<div
									className={heroCursor.active ? 'hero-screenshot-surface active' : 'hero-screenshot-surface'}
									style={{
										'--cursor-x': `${heroCursor.x}%`,
										'--cursor-y': `${heroCursor.y}%`,
									}}
									onMouseMove={handleHeroPointerMove}
									onMouseLeave={handleHeroPointerLeave}
								>
									<img src='/landing-dashboard.png' alt='Intelligent director dashboard preview' />
									<div className='hero-screenshot-shimmer' />
									<div className='hero-screenshot-glass' />
									<div className='hero-screenshot-cursor'>
										<span />
									</div>
								</div>
							</div>
							<div className='hero-metric-grid'>
								<div className='hero-metric-card' style={{ animationDelay: '0s' }}>
									<span>Oylik tushum</span>
									<strong>124.5M UZS</strong>
								</div>
								<div className='hero-metric-card' style={{ animationDelay: '.2s' }}>
									<span>Faol o'quvchilar</span>
									<strong>1,248 ta</strong>
								</div>
								<div className='hero-metric-card' style={{ animationDelay: '.4s' }}>
									<span>Sinovdagilar</span>
									<strong>46 ta</strong>
								</div>
								<div className='hero-metric-card' style={{ animationDelay: '.6s' }}>
									<span>Qarzdorlar</span>
									<strong>84 ta</strong>
								</div>
							</div>
							<div className='hero-live-strip'>
								<div className='hero-live-badge'>
									<span className='live-dot' />
									Real vaqt monitoring
								</div>
								<div className='hero-mini-chart'>
									<span style={{ '--bar-height': '48%' }} />
									<span style={{ '--bar-height': '72%' }} />
									<span style={{ '--bar-height': '58%' }} />
									<span style={{ '--bar-height': '84%' }} />
									<span style={{ '--bar-height': '66%' }} />
								</div>
							</div>
							<div className='hero-mockup-strip'>
								<div className='hero-mockup-card'>
									<strong>Reception</strong>
									<span>Student qo'shish, kurs biriktirish, to'lov qabul qilish</span>
								</div>
								<div className='hero-mockup-card'>
									<strong>Teacher</strong>
									<span>Davomat, guruhlar, history va kunlik nazorat</span>
								</div>
							</div>
							<div className='hero-table-preview'>
								<div className='hero-table-row head'>
									<span>Student</span>
									<span>Status</span>
									<span>Balans</span>
								</div>
								<div className='hero-table-row'>
									<span>Aziz A.</span>
									<span>Faol</span>
									<span>+450 000</span>
								</div>
								<div className='hero-table-row'>
									<span>Malika M.</span>
									<span>Sinov</span>
									<span>0 UZS</span>
								</div>
							</div>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' id='yonalishlar' delay={60}>
					<div className='section-heading'>
						<span>Yo'nalishlar</span>
						<h2>Intelligent o'quv markazida o'qitiladigan fanlar</h2>
						<p>
							Har bir yo'nalish uchun alohida metodika, kuchli ustoz va
							nazoratli o'qish muhiti qurilgan.
						</p>
					</div>
					<div className='course-pill-grid'>
						{LANDING_COURSE_SPOTLIGHTS.map(course => (
							<div key={course.title} className='course-pill-card course-showcase-card'>
								<div className='course-showcase-icon'>
									<Icon name={course.icon} />
								</div>
								<strong>{course.title}</strong>
								<span>{course.subtitle}</span>
								<small>{course.meta}</small>
							</div>
						))}
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' delay={100}>
					<div className='section-heading'>
						<span>Natijalar</span>
						<h2>Raqamlarda ko'rinadigan o'sish va nazorat</h2>
						<p>
							Markaz ichida ta'lim jarayoni, studentlar oqimi va nazorat
							ko'rsatkichlari bir tizimda boshqariladi.
						</p>
					</div>
					<div className='result-counter-grid'>
						<div className='result-counter-card'>
							<strong><CountUp end={1200} suffix='+' /></strong>
							<span>Faol o'quvchilar bilan ishlash sig'imi</span>
						</div>
						<div className='result-counter-card'>
							<strong><CountUp end={92} suffix='%' /></strong>
							<span>Davomat va nazorat samaradorligi</span>
						</div>
						<div className='result-counter-card'>
							<strong><CountUp end={10} suffix='+' /></strong>
							<span>Asosiy fan va yo'nalishlar</span>
						</div>
						<div className='result-counter-card'>
							<strong>24/7</strong>
							<span>Dashboard va student kabinet nazorati</span>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' id='afzalliklar' delay={140}>
					<div className='section-heading'>
						<span>Afzalliklar</span>
						<h2>O'quv markaz uchun real ishlaydigan raqamli tizim</h2>
					</div>
					<div className='feature-grid'>
						<div className='feature-card'>
							<Icon name='dashboard' />
							<h3>Director nazorati</h3>
							<p>Tushum, qarzdorlar, studentlar va kurslar bo'yicha umumiy nazorat.</p>
						</div>
						<div className='feature-card'>
							<Icon name='payments' />
							<h3>Payment va balans</h3>
							<p>To'lov qabul qilish, payment history va student balansini real yuritish.</p>
						</div>
						<div className='feature-card'>
							<Icon name='event_available' />
							<h3>Davomat tizimi</h3>
							<p>Teacher panel orqali kundalik davomat va student self-service tarixi.</p>
						</div>
						<div className='feature-card'>
							<Icon name='notifications' />
							<h3>Bildirishnomalar</h3>
							<p>Trial ending, absent alert, payment reminder va announcement oqimlari.</p>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' delay={180}>
					<div className='section-heading'>
						<span>Showcase</span>
						<h2>Asosiy kurs yo'nalishlari bo'yicha alohida fokus</h2>
						<p>
							Har bir yo'nalish uchun alohida metodika, monitoring va natijaga
							yo'naltirilgan ta'lim modeli ishlaydi.
						</p>
					</div>
					<div className='showcase-grid'>
						{LANDING_SHOWCASE_RICH.map((item, index) => (
							<section
								key={item.title}
								className='showcase-card'
								style={{ '--showcase-delay': `${index * 90}ms` }}
							>
								<div className='showcase-gradient-bar' style={{ background: item.gradient }} />
								<div className='showcase-icon' style={{ background: item.gradient }}>
									<Icon name={item.icon} />
								</div>
								<div className='showcase-copy'>
									<div className='showcase-badge-row'>
										<span className='showcase-result-badge'>{item.result}</span>
									</div>
									<h3>{item.title}</h3>
									<p>{item.description}</p>
									<span>{item.meta}</span>
									<div className='showcase-info-list'>
										<div className='showcase-info-item'>
											<strong>Kimlar uchun</strong>
											<p>{item.forWho}</p>
										</div>
										<div className='showcase-info-item'>
											<strong>Natija</strong>
											<p>{item.outcome}</p>
										</div>
									</div>
								</div>
							</section>
						))}
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' delay={260}>
					<div className='section-heading'>
						<span>Fikrlar</span>
						<h2>O'quvchilar va ota-onalar ishonchini beradigan tajriba</h2>
					</div>
					<div className='testimonial-carousel'>
						<div
							className='testimonial-track'
							style={{ transform: `translateX(-${testimonialIndex * 100}%)` }}
							onTouchStart={handleTestimonialTouchStart}
							onTouchEnd={handleTestimonialTouchEnd}
						>
							{LANDING_TESTIMONIALS_CLEAN.map(item => (
								<article key={item.name} className='testimonial-card testimonial-slide'>
								<div className='testimonial-head'>
									<div className='testimonial-avatar real-avatar'>
										<img src={item.avatar} alt={item.name} />
									</div>
									<div className='testimonial-stars'>
										<Icon name='star' className='filled-icon' />
										<Icon name='star' className='filled-icon' />
										<Icon name='star' className='filled-icon' />
										<Icon name='star' className='filled-icon' />
										<Icon name='star' className='filled-icon' />
									</div>
								</div>
								<p>"{item.quote}"</p>
								<div className='testimonial-author'>
									<strong>{item.name}</strong>
									<span>{item.role}</span>
								</div>
								<div className='testimonial-outcome'>{item.outcome}</div>
								</article>
							))}
						</div>
						<div className='testimonial-controls'>
							<div className='testimonial-dots'>
								{LANDING_TESTIMONIALS_CLEAN.map((item, index) => (
									<button
										key={item.name}
										type='button'
										className={testimonialIndex === index ? 'active' : ''}
										onClick={() => setTestimonialIndex(index)}
										aria-label={`${item.name} fikrini ko'rsatish`}
									/>
								))}
							</div>
							<div className='testimonial-arrow-row'>
								<button
									type='button'
									className='testimonial-arrow'
									onClick={() =>
										setTestimonialIndex(current =>
											current === 0 ? LANDING_TESTIMONIALS_CLEAN.length - 1 : current - 1,
										)
									}
									aria-label='Oldingi fikr'
								>
									<Icon name='west' />
								</button>
								<button
									type='button'
									className='testimonial-arrow'
									onClick={() =>
										setTestimonialIndex(current =>
											(current + 1) % LANDING_TESTIMONIALS_CLEAN.length,
										)
									}
									aria-label='Keyingi fikr'
								>
									<Icon name='east' />
								</button>
							</div>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' delay={240}>
					<div className='section-heading'>
						<span>Gallery</span>
						<h2>Platformaning real ishchi sahifalari</h2>
						<p>
							Ichki panellar, student kabineti va login oqimi bitta tizimda
							ishlaydigan real product sifatida ko‘rinadi.
						</p>
					</div>
					<div className='gallery-shell'>
						<div
							className='gallery-track'
							style={{ transform: `translateX(-${galleryIndex * 100}%)` }}
						>
							{LANDING_GALLERY.map(item => (
								<article key={item.title} className='gallery-slide'>
									<div className='gallery-slide-image'>
										<img src={item.image} alt={item.title} />
									</div>
									<div className='gallery-slide-copy'>
										<strong>{item.title}</strong>
										<p>{item.description}</p>
									</div>
								</article>
							))}
						</div>
						<div className='gallery-controls'>
							<div className='gallery-dots'>
								{LANDING_GALLERY.map((item, index) => (
									<button
										key={item.title}
										type='button'
										className={galleryIndex === index ? 'active' : ''}
										onClick={() => setGalleryIndex(index)}
										aria-label={`${item.title} ni ko'rsatish`}
									/>
								))}
							</div>
							<div className='gallery-arrows'>
								<button
									type='button'
									className='testimonial-arrow'
									onClick={() =>
										setGalleryIndex(current =>
											current === 0 ? LANDING_GALLERY.length - 1 : current - 1,
										)
									}
									aria-label='Oldingi screenshot'
								>
									<Icon name='west' />
								</button>
								<button
									type='button'
									className='testimonial-arrow'
									onClick={() =>
										setGalleryIndex(current => (current + 1) % LANDING_GALLERY.length)
									}
									aria-label='Keyingi screenshot'
								>
									<Icon name='east' />
								</button>
							</div>
						</div>
					</div>
				</RevealSection>

				<RevealSection className='marketing-section' delay={300}>
					<div className='cta-section'>
						<div>
							<span className='hero-badge'>Boshlash vaqti keldi</span>
							<h2>Intelligent bilan tartibli, nazoratli va natijali o'qish muhitiga qo'shiling</h2>
							<p>
								Student kabinet, ichki monitoring va o'quv markaz boshqaruvi bir
								joyda ishlaydigan tizim orqali sifatli ta'limni his qiling.
							</p>
						</div>
						<div className='cta-actions'>
							<Link to='/student/login' className='marketing-primary-btn'>
								Student kabinet
							</Link>
							<Link to='/admins' className='marketing-link-btn'>
								Admin login
							</Link>
						</div>
					</div>
				</RevealSection>

				<section className='marketing-section'>
					<div className='section-heading'>
						<span>FAQ</span>
						<h2>Ko'p beriladigan savollar</h2>
					</div>
					<div className='faq-list'>
						{LANDING_FAQS.map((item, index) => (
							<button
								key={item.question}
								type='button'
								className={activeFaq === index ? 'faq-item active' : 'faq-item'}
								onClick={() => setActiveFaq(current => (current === index ? -1 : index))}
							>
								<div className='faq-head'>
									<strong>{item.question}</strong>
									<Icon name={activeFaq === index ? 'remove' : 'add'} />
								</div>
								{activeFaq === index ? <p>{item.answer}</p> : null}
							</button>
						))}
					</div>
				</section>

				<RevealSection className='marketing-section contact-section' id='aloqa' delay={340}>
					<div className='contact-grid'>
						<div className='contact-card'>
							<div className='section-heading'>
								<span>Aloqa</span>
								<h2>Biz bilan bog'laning</h2>
								<p>
									Qaysi yo'nalish sizga mos ekanini aniqlash, darslar haqida
									ma'lumot olish yoki student kabinet bo'yicha savol berish
									uchun formani to'ldiring.
								</p>
							</div>
							<div className='contact-info-row'>
								<div className='contact-info-chip'>
									<Icon name='support_agent' />
									<div>
										<strong>Reception bilan aloqa</strong>
										<span>So'rov reception paneliga real vaqt tushadi</span>
									</div>
								</div>
								<div className='contact-info-chip'>
									<Icon name='schedule' />
									<div>
										<strong>Ish vaqti</strong>
										<span>Dushanba - Shanba, 08:00 - 20:00</span>
									</div>
								</div>
							</div>
							<form className='contact-form' onSubmit={handleContactSubmit}>
								<input
									placeholder='F.I.Sh'
									value={contactForm.fullName}
									onChange={event => setContactForm({ ...contactForm, fullName: event.target.value })}
								/>
								<input
									placeholder='+998 90 123 45 67'
									value={contactForm.phone}
									onChange={event => setContactForm({ ...contactForm, phone: formatPhoneInput(event.target.value) })}
								/>
								<textarea
									placeholder="Savolingiz yoki qiziqqan yo'nalishingizni yozing"
									value={contactForm.message}
									onChange={event => setContactForm({ ...contactForm, message: event.target.value })}
								/>
								<button className='marketing-primary-btn'>So'rov yuborish</button>
							</form>
						</div>
						<div className='location-card'>
							<div className='section-heading'>
								<span>Location</span>
								<h2>Bizning joylashuv</h2>
							</div>
							<div className='map-placeholder'>
								<iframe
									title='Intelligent location'
									src='https://maps.google.com/maps?q=Qorgontepa%20Andijon&t=&z=13&ie=UTF8&iwloc=&output=embed'
									loading='lazy'
									referrerPolicy='no-referrer-when-downgrade'
								/>
								<div className='map-overlay-card'>
									<div className='map-pin'>
										<Icon name='location_on' />
									</div>
									<div>
										<strong>Intelligent Education Center</strong>
										<span>Andijon viloyati, Qo'rg'ontepa tumani</span>
										<a
											href='https://maps.google.com/?daddr=Qorgontepa%20Andijon'
											target='_blank'
											rel='noreferrer'
											className='map-route-btn'
										>
											Yo'l ko'rsatish
										</a>
									</div>
								</div>
							</div>
							<div className='location-actions'>
								<a href='tel:+998901234567' className='location-action-chip'>
									<Icon name='call' />
									<span>Qo'ng'iroq</span>
								</a>
								<a href='https://t.me/intelligent_support' target='_blank' rel='noreferrer' className='location-action-chip'>
									<Icon name='send' />
									<span>Telegram</span>
								</a>
								<a href='https://instagram.com/intelligent_edu' target='_blank' rel='noreferrer' className='location-action-chip'>
									<Icon name='photo_camera' />
									<span>Instagram</span>
								</a>
							</div>
						</div>
					</div>
				</RevealSection>
			</main>
			<PublicSiteFooter />
		</div>
	)
}

function DevelopersPage() {
	const [developers, setDevelopers] = useState([])

	useEffect(() => {
		api.getDevelopersPublic().then(setDevelopers).catch(() => setDevelopers([]))
	}, [])

	return (
		<div className='marketing-page developers-standalone-page'>
			<main className='marketing-main developers-page'>
				<section className='developers-hero'>
					<div className='developers-hero-copy'>
						<span>Team</span>
						<h1>Dasturchilar jamoasi</h1>
						<p>
							Intelligent loyihasining dizayn, frontend va backend arxitekturasi
							ustida ishlayotgan jamoa a'zolari bilan tanishing.
						</p>
					</div>
					<div className='developers-hero-stats'>
						<div>
							<strong>3 ta</strong>
							<span>Asosiy mutaxassis</span>
						</div>
						<div>
							<strong>Full-stack</strong>
							<span>Jamoaviy ishlab chiqish</span>
						</div>
					</div>
				</section>
				<div className='developer-card-grid'>
					{developers.map(developer => (
						<Link key={developer.slug} to={`/dasturchilar/${developer.slug}`} className='developer-card'>
							<div className='developer-avatar'>
								{developer.image ? <img src={developer.image} alt={developer.fullName} /> : <span>{getInitials(developer.fullName)}</span>}
							</div>
							<div className='developer-card-copy'>
								<div className='developer-card-top'>
									<h3>{developer.fullName}</h3>
									<span>{developer.age ? `${developer.age} yosh` : ''}</span>
								</div>
								<strong>{developer.roleTitle}</strong>
								<p>{developer.shortBio}</p>
								<div className='developer-skill-row'>
									{developer.skills.slice(0, 4).map(skill => (
										<span key={skill}>{skill}</span>
									))}
								</div>
							</div>
						</Link>
					))}
				</div>
			</main>
		</div>
	)
}

function DeveloperDetailPage() {
	const { slug } = useParams()
	const [developer, setDeveloper] = useState(null)

	useEffect(() => {
		api.getDeveloperPublic(slug).then(setDeveloper).catch(() => setDeveloper(null))
	}, [slug])

	if (!developer) {
		return <div className='loading-screen'>Dasturchi ma'lumoti yuklanmoqda...</div>
	}

	return (
		<div className='marketing-page developers-standalone-page'>
			<main className='marketing-main developer-detail-page'>
				<section className='developer-hero' style={developer.bannerImage ? { backgroundImage: `linear-gradient(rgba(10,23,62,.65), rgba(10,23,62,.65)), url(${developer.bannerImage})` } : undefined}>
					<div className='developer-hero-avatar'>
						{developer.image ? <img src={developer.image} alt={developer.fullName} /> : <span>{getInitials(developer.fullName)}</span>}
					</div>
					<div className='developer-hero-copy'>
						<Badge tone='success'>{developer.roleTitle}</Badge>
						<h1>{developer.fullName}</h1>
						<p>{developer.shortBio}</p>
						<div className='developer-link-row'>
							{developer.telegramUrl ? <a href={developer.telegramUrl} target='_blank' rel='noreferrer'>Telegram</a> : null}
							{developer.instagramUrl ? <a href={developer.instagramUrl} target='_blank' rel='noreferrer'>Instagram</a> : null}
							{developer.githubUrl ? <a href={developer.githubUrl} target='_blank' rel='noreferrer'>GitHub</a> : null}
							{developer.websiteUrl ? <a href={developer.websiteUrl} target='_blank' rel='noreferrer'>Website</a> : null}
						</div>
					</div>
				</section>

				<section className='developer-detail-grid'>
					<div className='card developer-about-card'>
						<h3>Biografiya</h3>
						<p>{developer.bio || developer.shortBio}</p>
					</div>
					<div className='card developer-skill-card'>
						<h3>Ko'nikmalar</h3>
						<div className='developer-skill-row'>
							{developer.skills.map(skill => (
								<span key={skill}>{skill}</span>
							))}
						</div>
					</div>
					{developer.certificateImage ? (
						<div className='card developer-certificate-card'>
							<h3>Sertifikat</h3>
							<img src={developer.certificateImage} alt='Sertifikat' />
						</div>
					) : null}
				</section>
			</main>
		</div>
	)
}

function DeveloperPortalPage() {
	const [auth, setAuth] = useState(() => {
		const raw = localStorage.getItem('intelligent-developer-auth')
		return raw ? JSON.parse(raw) : null
	})
	const [loginForm, setLoginForm] = useState({ username: '', password: '' })
	const [profile, setProfile] = useState(null)
	const [form, setForm] = useState(null)
	const [uploadNames, setUploadNames] = useState({
		image: '',
		bannerImage: '',
		certificateImage: '',
	})
	const [showPassword, setShowPassword] = useState(false)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!auth?.token) {
			setProfile(null)
			setForm(null)
			return
		}
		api.getDeveloperMe(auth.token).then(data => {
			setProfile(data)
			setForm({
				username: data.username || '',
				fullName: data.fullName || '',
				age: data.age || '',
				roleTitle: data.roleTitle || '',
				shortBio: data.shortBio || '',
				bio: data.bio || '',
				skills: (data.skills || []).join(', '),
				telegramUrl: data.telegramUrl || '',
				instagramUrl: data.instagramUrl || '',
				githubUrl: data.githubUrl || '',
				websiteUrl: data.websiteUrl || '',
				image: data.image || '',
				bannerImage: data.bannerImage || '',
				certificateImage: data.certificateImage || '',
				password: '',
			})
		}).catch(() => {
			localStorage.removeItem('intelligent-developer-auth')
			setAuth(null)
		})
	}, [auth?.token])

	async function handleDeveloperLogin(event) {
		event.preventDefault()
		setLoading(true)
		try {
			const data = await api.developerLogin(loginForm)
			localStorage.setItem('intelligent-developer-auth', JSON.stringify(data))
			setAuth(data)
			await showSuccess('Kirish muvaffaqiyatli', 'Portfolio panel ochildi')
		} catch (err) {
			await showError(err.message)
		} finally {
			setLoading(false)
		}
	}

	async function handleAssetChange(field, file) {
		if (!file) return
		const value = await readFileAsDataUrl(file)
		setForm(current => ({ ...current, [field]: value }))
		setUploadNames(current => ({ ...current, [field]: file.name }))
	}

	async function handleDeveloperSave(event) {
		event.preventDefault()
		setLoading(true)
		try {
			const payload = {
				...form,
				skills: String(form.skills || '')
					.split(',')
					.map(item => item.trim())
					.filter(Boolean),
			}
			const data = await api.updateDeveloperMe(auth.token, payload)
			setProfile(data)
			setForm(current => ({ ...current, password: '' }))
			await showSuccess('Saqlandi', "Portfolio ma'lumotlari yangilandi")
		} catch (err) {
			await showError(err.message)
		} finally {
			setLoading(false)
		}
	}

	if (!auth) {
		return (
			<div className='login-screen login-screen-admin'>
				<main className='admin-login-wrap'>
					<div className='admin-brand'>
						<div className='admin-brand-icon'>
							<Icon name='code' className='filled-icon' />
						</div>
						<span className='admin-brand-text'>Dasturchilar Paneli</span>
					</div>
					<div className='admin-login-card'>
						<div className='admin-login-copy'>
							<h2>Portfolio login</h2>
							<p>Faqat o'zingizning sahifangizni boshqarish uchun kiring.</p>
						</div>
						<form className='admin-login-form' onSubmit={handleDeveloperLogin}>
							<div className='admin-field-group'>
								<label>Login</label>
								<div className='admin-input-shell'>
									<Icon name='person' className='admin-input-icon' />
									<input value={loginForm.username} onChange={event => setLoginForm({ ...loginForm, username: event.target.value })} />
								</div>
							</div>
							<div className='admin-field-group'>
								<label>Parol</label>
								<div className='admin-input-shell'>
									<Icon name='lock' className='admin-input-icon' />
									<input type={showPassword ? 'text' : 'password'} value={loginForm.password} onChange={event => setLoginForm({ ...loginForm, password: event.target.value })} />
									<button type='button' className='admin-visibility-btn' onClick={() => setShowPassword(value => !value)}>
										<Icon name={showPassword ? 'visibility_off' : 'visibility'} className='admin-input-icon' />
									</button>
								</div>
							</div>
							<button className='admin-submit-btn' disabled={loading}>
								{loading ? 'Kirilmoqda...' : 'Kirish'}
							</button>
						</form>
					</div>
				</main>
			</div>
		)
	}

	if (!form || !profile) {
		return <div className='loading-screen'>Portfolio panel yuklanmoqda...</div>
	}

	return (
		<div className='developer-portal-page'>
			<div className='developer-portal-head'>
				<div>
					<h1>{profile.fullName} paneli</h1>
					<p>Faqat o'zingizning portfolio kartangizni va batafsil sahifangizni boshqarasiz.</p>
				</div>
				<div className='developer-portal-actions'>
					<Link to={`/dasturchilar/${profile.slug}`} className='marketing-link-btn'>
						Public sahifa
					</Link>
					<button type='button' className='marketing-primary-btn' onClick={() => {
						localStorage.removeItem('intelligent-developer-auth')
						setAuth(null)
					}}>
						Chiqish
					</button>
				</div>
			</div>

			<form className='developer-portal-form' onSubmit={handleDeveloperSave}>
				<div className='developer-portal-grid'>
					<section className='card settings-card'>
						<h3>Asosiy ma'lumotlar</h3>
						<div className='modal-form'>
							<div className='field-grid'>
								<div>
									<label>Login</label>
									<input value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} />
								</div>
								<div>
									<label>F.I.Sh</label>
									<input value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} />
								</div>
								<div>
									<label>Yosh</label>
									<input value={form.age} onChange={event => setForm({ ...form, age: event.target.value })} />
								</div>
								<div>
									<label>Kim bo'lib ishlaydi</label>
									<input value={form.roleTitle} onChange={event => setForm({ ...form, roleTitle: event.target.value })} />
								</div>
							</div>
							<div>
								<label>Qisqa tafsif</label>
								<input value={form.shortBio} onChange={event => setForm({ ...form, shortBio: event.target.value })} />
							</div>
							<div>
								<label>Batafsil tafsif</label>
								<textarea className='developer-textarea' value={form.bio} onChange={event => setForm({ ...form, bio: event.target.value })} />
							</div>
							<div>
								<label>Skillar (vergul bilan)</label>
								<input value={form.skills} onChange={event => setForm({ ...form, skills: event.target.value })} />
							</div>
							<div>
								<label>Yangi parol</label>
								<input type='password' value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
							</div>
						</div>
					</section>

					<section className='card settings-card'>
						<h3>Linklar va media</h3>
						<div className='modal-form'>
							<div className='field-grid'>
								<div>
									<label>Telegram</label>
									<input value={form.telegramUrl} onChange={event => setForm({ ...form, telegramUrl: event.target.value })} />
								</div>
								<div>
									<label>Instagram</label>
									<input value={form.instagramUrl} onChange={event => setForm({ ...form, instagramUrl: event.target.value })} />
								</div>
								<div>
									<label>GitHub</label>
									<input value={form.githubUrl} onChange={event => setForm({ ...form, githubUrl: event.target.value })} />
								</div>
								<div>
									<label>Website</label>
									<input value={form.websiteUrl} onChange={event => setForm({ ...form, websiteUrl: event.target.value })} />
								</div>
							</div>
							<div className='field-grid'>
								<div>
									<label>Profil rasmi</label>
									<label className='developer-upload-card'>
										<input type='file' accept='image/*' onChange={event => handleAssetChange('image', event.target.files?.[0])} />
										<div className='developer-upload-icon'>
											<Icon name='upload' />
										</div>
										<div className='developer-upload-copy'>
											<strong>Profil rasmini yuklash</strong>
											<span>{uploadNames.image || (form.image ? 'Rasm biriktirilgan' : 'PNG, JPG yoki WEBP')}</span>
										</div>
									</label>
								</div>
								<div>
									<label>Banner rasmi</label>
									<label className='developer-upload-card'>
										<input type='file' accept='image/*' onChange={event => handleAssetChange('bannerImage', event.target.files?.[0])} />
										<div className='developer-upload-icon'>
											<Icon name='image' />
										</div>
										<div className='developer-upload-copy'>
											<strong>Banner yuklash</strong>
											<span>{uploadNames.bannerImage || (form.bannerImage ? 'Banner biriktirilgan' : 'Hero fon rasmi uchun')}</span>
										</div>
									</label>
								</div>
								<div>
									<label>Sertifikat rasmi</label>
									<label className='developer-upload-card'>
										<input type='file' accept='image/*' onChange={event => handleAssetChange('certificateImage', event.target.files?.[0])} />
										<div className='developer-upload-icon'>
											<Icon name='workspace_premium' />
										</div>
										<div className='developer-upload-copy'>
											<strong>Sertifikat yuklash</strong>
											<span>{uploadNames.certificateImage || (form.certificateImage ? 'Sertifikat biriktirilgan' : 'Diplom yoki sertifikat rasmi')}</span>
										</div>
									</label>
								</div>
							</div>
						</div>
					</section>
				</div>
				<div className='developer-portal-submit'>
					<button className='marketing-primary-btn' disabled={loading}>
						{loading ? 'Saqlanmoqda...' : "Ma'lumotlarni saqlash"}
					</button>
				</div>
			</form>
		</div>
	)
}

function StudentLoginPage({ onLogin }) {
	const [studentForm, setStudentForm] = useState({ phone: '', password: '' })
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	async function handleStudentLogin(event) {
		event.preventDefault()
		setLoading(true)
		try {
			const data = await api.studentLogin(studentForm)
			onLogin(data)
		} catch (err) {
			await showError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='login-screen login-screen-admin'>
			<main className='admin-login-wrap'>
				<div className='admin-brand'>
					<div className='admin-brand-icon'>
						<Icon name='auto_stories' className='filled-icon' />
					</div>
					<span className='admin-brand-text'>Intelligent</span>
				</div>

				<div className='admin-login-card'>
					<div className='admin-login-copy'>
						<h2>Xush kelibsiz!</h2>
						<p>Student kabinetga telefon va parol bilan kiring.</p>
					</div>

					<form className='admin-login-form' onSubmit={handleStudentLogin}>
						<div className='admin-field-group'>
							<label htmlFor='student-phone'>Telefon raqam</label>
							<div className='admin-input-shell'>
								<Icon name='call' className='admin-input-icon' />
								<input
									id='student-phone'
									placeholder='+998932303410'
									value={studentForm.phone}
									onChange={event =>
										setStudentForm({
											...studentForm,
											phone: formatPhoneInput(event.target.value),
										})
									}
								/>
							</div>
						</div>

						<div className='admin-field-group'>
							<label htmlFor='student-password'>Parol</label>
							<div className='admin-input-shell'>
								<Icon name='lock' className='admin-input-icon' />
								<input
									id='student-password'
									type={showPassword ? 'text' : 'password'}
									placeholder='********'
									value={studentForm.password}
									onChange={event =>
										setStudentForm({ ...studentForm, password: event.target.value })
									}
								/>
								<button
									type='button'
									className='admin-visibility-btn'
									onClick={() => setShowPassword(value => !value)}
								>
									<Icon
										name={showPassword ? 'visibility_off' : 'visibility'}
										className='admin-input-icon'
									/>
								</button>
							</div>
						</div>

						<button className='admin-submit-btn' disabled={loading}>
							{loading ? 'Kutilmoqda...' : 'Kirish'}
						</button>
					</form>

					<div className='login-help'>
						<p>
							Registratsiya havolangiz bormi?{' '}
							<Link to='/register' className='text-link'>
								Ro'yxatdan o'tish
							</Link>
						</p>
					</div>
				</div>
			</main>
		</div>
	)
}

function AdminLoginPage({ onLogin }) {
	const [staffForm, setStaffForm] = useState({
		username: '',
		password: '',
	})
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	async function handleStaffLogin(event) {
		event.preventDefault()
		setLoading(true)
		setError('')
		try {
			const data = await api.login(staffForm)
			onLogin(data)
		} catch (err) {
			setError(err.message)
			await showError(err.message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='login-screen login-screen-admin'>
			<main className='admin-login-wrap'>
				<div className='admin-brand'>
					<div className='admin-brand-icon'>
						<Icon name='auto_stories' className='filled-icon' />
					</div>
					<span className='admin-brand-text'>Intelligent</span>
				</div>

				<div className='admin-login-card'>
					<div className='admin-login-copy'>
						<h2>Xush kelibsiz!</h2>
						<p>Intelligent tizimga kiring.</p>
					</div>

					<form className='admin-login-form' onSubmit={handleStaffLogin}>
						<div className='admin-field-group'>
							<label htmlFor='admin-username'>Foydalanuvchi nomi</label>
							<div className='admin-input-shell'>
								<Icon name='person' className='admin-input-icon' />
								<input
									id='admin-username'
									placeholder='@Username'
									value={staffForm.username}
									onChange={event =>
										setStaffForm({ ...staffForm, username: event.target.value })
									}
								/>
							</div>
						</div>

						<div className='admin-field-group'>
							<label htmlFor='admin-password'>Parol</label>
							<div className='admin-input-shell'>
								<Icon name='lock' className='admin-input-icon' />
								<input
									id='admin-password'
									type={showPassword ? 'text' : 'password'}
									placeholder='********'
									value={staffForm.password}
									onChange={event =>
										setStaffForm({ ...staffForm, password: event.target.value })
									}
								/>
								<button
									type='button'
									className='admin-visibility-btn'
									onClick={() => setShowPassword(value => !value)}
								>
									<Icon
										name={showPassword ? 'visibility_off' : 'visibility'}
										className='admin-input-icon'
									/>
								</button>
							</div>
						</div>

						<div className='admin-login-row'>
							<label className='admin-remember'>
								<input type='checkbox' />
								<span>Eslab qolish</span>
							</label>
						</div>

						<button className='admin-submit-btn' disabled={loading}>
							{loading ? 'Kutilmoqda...' : 'Tizimga kirish'}
						</button>
					</form>
				</div>
			</main>
		</div>
	)
}

function StudentRegisterPage() {
	const [searchParams] = useSearchParams()
	const token = searchParams.get('token') || ''
	const [data, setData] = useState(null)
	const [form, setForm] = useState({ phone: '', password: '' })
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	useEffect(() => {
		if (!token) {
			setLoading(false)
			return
		}
		api
			.validateStudentRegisterToken(token)
			.then(result => {
				setData(result)
				setForm(current => ({ ...current, phone: formatPhoneInput(result.phone || '') }))
			})
			.catch(err => showError(err.message))
			.finally(() => setLoading(false))
	}, [token])

	async function handleSubmit(event) {
		event.preventDefault()
		setSubmitting(true)
		try {
			await api.registerStudent({
				token,
				phone: form.phone,
				password: form.password,
			})
			await showSuccess("Ro'yxatdan o'tildi", 'Endi student login orqali tizimga kirishingiz mumkin')
		} catch (err) {
			await showError(err.message)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className='login-screen login-screen-admin'>
			<main className='admin-login-wrap'>
				<div className='admin-brand'>
					<div className='admin-brand-icon'>
						<Icon name='auto_stories' className='filled-icon' />
					</div>
					<span className='admin-brand-text'>Intelligent</span>
				</div>
				<div className='admin-login-card'>
					<div className='admin-login-copy'>
						<h2>Ro'yxatdan o'tish</h2>
						<p>Student kabinet uchun hisob yarating.</p>
					</div>
					{loading ? (
						<div className='loading-screen'>Token tekshirilmoqda...</div>
					) : !token || !data ? (
						<div className='form-error'>Token topilmadi yoki yaroqsiz</div>
					) : (
						<form className='admin-login-form' onSubmit={handleSubmit}>
							<div className='admin-field-group'>
								<label>Ism</label>
								<div className='admin-input-shell'>
									<Icon name='person' className='admin-input-icon' />
									<input value={data.firstName} readOnly />
								</div>
							</div>
							<div className='admin-field-group'>
								<label>Familiya</label>
								<div className='admin-input-shell'>
									<Icon name='badge' className='admin-input-icon' />
									<input value={data.lastName} readOnly />
								</div>
							</div>
							<div className='admin-field-group'>
								<label>Telefon</label>
								<div className='admin-input-shell'>
									<Icon name='call' className='admin-input-icon' />
									<input
										value={form.phone}
										onChange={event =>
											setForm({
												...form,
												phone: formatPhoneInput(event.target.value),
											})
										}
									/>
								</div>
							</div>
							<div className='admin-field-group'>
								<label>Parol</label>
								<div className='admin-input-shell'>
									<Icon name='lock' className='admin-input-icon' />
									<input
										type={showPassword ? 'text' : 'password'}
										value={form.password}
										onChange={event =>
											setForm({ ...form, password: event.target.value })
										}
									/>
									<button
										type='button'
										className='admin-visibility-btn'
										onClick={() => setShowPassword(value => !value)}
									>
										<Icon
											name={showPassword ? 'visibility_off' : 'visibility'}
											className='admin-input-icon'
										/>
									</button>
								</div>
							</div>
							<button className='admin-submit-btn' disabled={submitting}>
								{submitting ? 'Saqlanmoqda...' : "Ro'yxatdan o'tish"}
							</button>
						</form>
					)}
					<div className='login-help'>
						<p>
							Hisobingiz bormi?{' '}
							<Link to='/student/login' className='text-link'>
								Student login
							</Link>
						</p>
					</div>
				</div>
			</main>
		</div>
	)
}

function StatCard({
	label,
	value,
	note,
	tone = 'default',
	icon = 'dashboard',
}) {
	return (
		<section className={`kpi-card ${tone}`}>
			<div className='kpi-head'>
				<span>{label}</span>
				<div className={`kpi-icon ${tone}`}>
					<Icon name={icon} />
				</div>
			</div>
			<strong>{value}</strong>
			{note ? (
				<p className={tone === 'danger' ? 'danger-text' : 'success-text'}>
					{note}
				</p>
			) : null}
		</section>
	)
}

function useStudentData(token) {
	const [data, setData] = useState(null)
	useEffect(() => {
		api.getStudentMe(token).then(setData)
	}, [token])
	return data
}

function useReceptionData(token, query = {}) {
	const [students, setStudents] = useState([])

	async function reload(next = query) {
		const data = await api.getReceptionStudents(token, next)
		setStudents(data)
	}

	useEffect(() => {
		reload(query)
	}, [token])

	return { students, reload, setStudents }
}

function usePaymentsData(token) {
	const [payments, setPayments] = useState([])
	useEffect(() => {
		api.getAllPayments(token).then(setPayments)
	}, [token])
	return [payments, setPayments]
}

function StudentDashboardPage({ token }) {
	const data = useStudentData(token)
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	const { profile, payments } = data
	const statusMeta = getStudentStatusMeta(profile.status)
	const debt = Math.max(
		Number(profile.monthlyFee || 0) - Number(profile.balance || 0),
		0,
	)

	return (
		<>
			<section className='student-overview-card'>
				<div className='student-overview-copy'>
					<div className='card-label-row'>
						<span className='card-label'>STUDENT KABINETI</span>
						<Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
					</div>
					<h1>{profile.fullName}</h1>
					<p>
						Kurs: <strong>{profile.courseTitle || '-'}</strong> · Ustoz:{' '}
						<strong>{profile.teacherName || '-'}</strong>
					</p>
					<div className='student-overview-pills'>
						<span className='overview-pill'>
							<Icon name='event_available' />
							Keyingi dars: {profile.nextLessonDate || '-'}
						</span>
						<span className='overview-pill'>
							<Icon name='workspace_premium' />
							Sinov progress: {profile.trialProgress || 0}/
							{profile.trialRequired || 3}
						</span>
					</div>
				</div>
				<div className='student-overview-balance'>
					<span>Joriy balans</span>
					<strong>{formatMoney(profile.balance)}</strong>
					<small>
						{debt > 0
							? `Yopilishi kerak: ${formatMoney(debt)}`
							: "Qarzdorlik yo'q"}
					</small>
				</div>
			</section>

			<div className='student-summary-grid'>
				<StatCard
					label='Status'
					value={statusMeta.label}
					note='Kabinet holati'
					icon='verified_user'
					tone={statusMeta.tone}
				/>
				<StatCard
					label="Oylik to'lov"
					value={formatMoney(profile.monthlyFee)}
					note='Kurs tarifi'
					icon='payments'
				/>
				<StatCard
					label='Sinov progress'
					value={`${profile.trialProgress || 0}/${profile.trialRequired || 3}`}
					note='Dars kuni hisoboti'
					icon='school'
					tone='warning'
				/>
			</div>

			<div className='student-grid'>
				<section className='card balance-box'>
					<div className='card-label-row'>
						<span className='card-label'>MENING BALANSIM</span>
						<Badge tone={statusMeta.tone}>
							{statusMeta.label}
						</Badge>
					</div>
					<div className='student-balance'>{formatMoney(profile.balance)}</div>
					<div className='student-actions'>
						<ActionButton icon='add_circle'>To'ldirish</ActionButton>
						<button type='button' className='square-btn icon-only-btn'>
							<Icon name='history' />
						</button>
					</div>
				</section>

				<section className='card course-box'>
					<span className='card-label'>JORIY KURS</span>
					<h2>{profile.courseTitle}</h2>
					<p className='teacher-line'>Ustoz: {profile.teacherName}</p>
					<div className='course-mini-stats'>
						<div>
							<span>OYLIK TO'LOV</span>
							<strong>{formatMoney(profile.monthlyFee)}</strong>
						</div>
						<div>
							<span>SINOV HOLATI</span>
							<strong>{profile.trialProgress || 0}/{profile.trialRequired || 3}</strong>
						</div>
					</div>
					<div className='student-quick-links'>
						<Link to='/student/schedule' className='ghost-outline link-btn'>
							Jadvalni ko'rish
						</Link>
						<Link
							to='/student/notifications'
							className='ghost-outline link-btn secondary-link-btn'
						>
							Bildirishnomalar
						</Link>
					</div>
				</section>

				<section className='card payment-table-card'>
					<div className='card-head-row'>
						<h3>To'lovlar Tarixi</h3>
						<Link to='/student/payments' className='text-link'>
							Barchasini ko'rish
						</Link>
					</div>
					<div className='table-shell'>
						<table>
							<thead>
								<tr>
									<th>SANA</th>
									<th>SUMMA</th>
									<th>USUL</th>
									<th>STATUS</th>
									<th>AMAL</th>
								</tr>
							</thead>
							<tbody>
								{payments.map(payment => (
									<tr key={payment.id}>
										<td>{payment.createdAt}</td>
										<td className='amount-cell'>
											{formatMoney(payment.amount)}
										</td>
										<td>{getPaymentMethodMeta(payment.method).shortLabel}</td>
										<td>
											<Badge
												tone={payment.status === 'paid' ? 'success' : 'danger'}
											>
												{payment.status === 'paid'
													? 'Muvaffaqiyatli'
													: payment.status}
											</Badge>
										</td>
										<td className='receipt-cell'>
											<Icon name='receipt_long' />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			</div>
		</>
	)
}

function StudentAttendancePage({ token }) {
	const [data, setData] = useState(null)
	useEffect(() => {
		api.getStudentAttendance(token).then(setData)
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	return (
		<>
			<PageHeader title='Davomat' subtitle='Oxirgi 30 kunlik qatnashuv' />
			<div className='three-column-grid'>
				<StatCard label='Davomat foizi' value={`${data.percentage}%`} note="So'nggi 30 kun" icon='leaderboard' />
				<StatCard label='Keldi' value={`${data.last30Days.present} ta`} note='Present' icon='check_circle' />
				<StatCard label='Kelmadi' value={`${data.last30Days.absent} ta`} note='Absent' tone='danger' icon='cancel' />
			</div>
			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>Sana</th>
								<th>Holat</th>
							</tr>
						</thead>
						<tbody>
							{data.items.map(item => (
								<tr key={`${item.date}-${item.status}`}>
									<td>{item.date}</td>
									<td data-label="O'quvchi">
										<Badge tone={item.status === 'present' ? 'success' : 'danger'}>
											{item.status === 'present' ? 'Keldi' : 'Kelmadi'}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function StudentPaymentsPage({ token }) {
	const [data, setData] = useState(null)
	useEffect(() => {
		api.getStudentPayments(token).then(setData)
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	return (
		<>
			<PageHeader title="To'lovlar" subtitle='Barcha payment tarixingiz' />
			<div className='two-column-grid'>
				<StatCard label='Joriy balans' value={formatMoney(data.balance)} note="Hisobingizdagi mablag'" icon='payments' />
				<StatCard label='Qarz' value={formatMoney(data.debt)} note="Agar mavjud bo'lsa" tone={data.debt > 0 ? 'danger' : 'default'} icon='warning' />
			</div>
			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>SANA</th>
								<th>SUMMA</th>
								<th>USUL</th>
								<th>STATUS</th>
								<th>QABUL QILDI</th>
							</tr>
						</thead>
						<tbody>
							{data.items.map(payment => (
								<tr key={payment.id}>
									<td>{payment.createdAt}</td>
									<td className='amount-cell'>{formatMoney(payment.amount)}</td>
									<td>{getPaymentMethodMeta(payment.method).shortLabel}</td>
									<td data-label='Kontakt'>
										<Badge
											tone={payment.status === 'paid' ? 'success' : 'danger'}
										>
											{payment.status === 'paid'
												? 'Muvaffaqiyatli'
												: payment.status}
										</Badge>
									</td>
									<td>{payment.receivedBy || '-'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function StudentSchedulePage({ token }) {
	const [data, setData] = useState(null)
	useEffect(() => {
		api.getStudentSchedule(token).then(setData)
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	return (
		<>
			<PageHeader title='Jadval' subtitle='Haftalik dars jadvali' />
			<section className='card schedule-card'>
				<div className='schedule-card-head'>
					<div>
						<h3>{data.courseTitle}</h3>
						<p>{data.teacherName || "Ustoz biriktirilmagan"}</p>
					</div>
					<Badge tone='success'>Haftalik jadval</Badge>
				</div>
				<div className='schedule-week-grid'>
					{data.items.map(item => (
						<div
							key={item.day}
							className={item.isToday ? 'schedule-day-card today' : 'schedule-day-card'}
						>
							<div className='schedule-day-top'>
								<strong>{item.day}</strong>
								{item.isToday ? <span>Bugun</span> : null}
							</div>
							<div className='schedule-day-time'>
								<Icon name='schedule' />
								{item.time || '-'}
							</div>
						</div>
					))}
				</div>
			</section>
		</>
	)
}

function StudentNotificationsPage({ token }) {
	const [items, setItems] = useState([])
	useEffect(() => {
		api.getStudentNotifications(token).then(setItems)
	}, [token])

	async function readNotification(id) {
		await api.readNotification(token, id)
		setItems(current => current.map(item => item.id === id ? { ...item, status: 'read' } : item))
	}

	return (
		<>
			<PageHeader title='Bildirishnomalar' subtitle='Student uchun barcha ogohlantirishlar' />
			<section className='card'>
				<div className='timeline-list'>
					{items.map(item => (
						<button key={item.id} type='button' className={item.status === 'read' ? 'notification-item read' : 'notification-item'} onClick={() => readNotification(item.id)}>
							<strong>{item.title}</strong>
							<span>{item.message}</span>
						</button>
					))}
				</div>
			</section>
		</>
	)
}

function StudentProfilePage({ token }) {
	const [data, setData] = useState(null)
	const [form, setForm] = useState({ password: '' })
	useEffect(() => {
		api.getStudentProfile(token).then(setData)
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>

	async function handleSubmit(event) {
		event.preventDefault()
		try {
			await api.updateStudentPassword(token, form)
			setForm({ password: '' })
			await showSuccess('Yangilandi', 'Parol muvaffaqiyatli yangilandi')
		} catch (err) {
			await showError(err.message)
		}
	}

	return (
		<>
			<PageHeader
				title='Profil'
				subtitle="Shaxsiy ma'lumotlar va parol boshqaruvi"
			/>
			<section className='card settings-card'>
				<form className='modal-form' onSubmit={handleSubmit}>
					<div className='field-grid'>
					<div>
						<label>F.I.Sh</label>
						<input value={data.fullName} readOnly />
					</div>
					<div>
						<label>Telefon</label>
						<input value={data.phone || ''} readOnly />
					</div>
					<div>
						<label>Yangi parol</label>
						<input
							type='password'
							value={form.password}
							onChange={event => setForm({ password: event.target.value })}
						/>
					</div>
					</div>
					<div className='modal-actions'>
						<span />
						<ActionButton type='submit' icon='save'>Parolni saqlash</ActionButton>
					</div>
				</form>
			</section>
		</>
	)
}

function StudentFormModal({ meta, initialData, onClose, onSubmit }) {
	const [form, setForm] = useState(initialData)
	const selectedCourse = meta.courses.find(
		course => Number(course.id) === Number(form.courseId),
	)
	const availableTeachers = meta.teachers.filter(teacher =>
		(teacher.courseIds || []).includes(Number(form.courseId)),
	)

	useEffect(() => {
		if (!availableTeachers.length) return
		const hasSelectedTeacher = availableTeachers.some(
			teacher => Number(teacher.id) === Number(form.teacherId),
		)
		if (!hasSelectedTeacher) {
			setForm(current => ({ ...current, teacherId: availableTeachers[0].id }))
		}
	}, [form.courseId])

	return (
		<Modal
			title={initialData.id ? "O'quvchini tahrirlash" : "Yangi o'quvchi"}
			subtitle="Student ma'lumotlarini to'ldiring"
			onClose={onClose}
		>
			<form
				className='modal-form'
				onSubmit={event => {
					if (!availableTeachers.length) {
						event.preventDefault()
						showError(
							"Avval director bu kursga mos o'qituvchi biriktirishi kerak",
						)
						return
					}
					onSubmit(event, form)
				}}
			>
				<div className='field-grid'>
					<div>
						<label>F.I.Sh</label>
						<input
							value={form.fullName}
							onChange={e => setForm({ ...form, fullName: e.target.value })}
						/>
					</div>
					<div>
						<label>Telefon</label>
						<input
							value={form.phone}
							onChange={e => setForm({ ...form, phone: e.target.value })}
						/>
					</div>
					<div>
						<label>Kurs</label>
						<select
							value={form.courseId}
							onChange={e =>
								setForm({ ...form, courseId: Number(e.target.value) })
							}
						>
							{meta.courses.map(course => (
								<option key={course.id} value={course.id}>
									{course.title}
								</option>
							))}
						</select>
					</div>
					<div>
						<label>O'qituvchi</label>
						<select
							value={form.teacherId}
							onChange={e =>
								setForm({ ...form, teacherId: Number(e.target.value) })
							}
						>
							{availableTeachers.length ? (
								availableTeachers.map(teacher => (
									<option key={teacher.id} value={teacher.id}>
										{teacher.fullName}
									</option>
								))
							) : (
								<option value=''>Bu kurs uchun ustoz biriktirilmagan</option>
							)}
						</select>
					</div>
					<div>
						<label>Kurs narxi</label>
						<input
							value={
								selectedCourse ? formatMoney(selectedCourse.monthlyFee) : ''
							}
							readOnly
						/>
					</div>
					<div>
						<label>Sinov qoidasi</label>
						<input
							value="Ro'yxatdan o'tgan kundan 3 ta o'qish kuni sinov"
							readOnly
						/>
					</div>
				</div>
				<div className='modal-actions'>
					<button type='button' className='ghost-outline' onClick={onClose}>
						Bekor qilish
					</button>
					<ActionButton type='submit'>Saqlash</ActionButton>
				</div>
			</form>
		</Modal>
	)
}

function PaymentModal({ students, initialData, onClose, onSubmit }) {
	const [form, setForm] = useState(initialData)

	return (
		<Modal
			title="To'lov qabul qilish"
			subtitle='Manual payment kiritish'
			onClose={onClose}
		>
			<form className='modal-form' onSubmit={event => onSubmit(event, form)}>
				<div className='field-grid'>
					<div>
						<label>Student</label>
						<select
							value={form.studentId}
							onChange={e =>
								setForm({ ...form, studentId: Number(e.target.value) })
							}
						>
							<option value=''>Tanlang</option>
							{students.map(student => (
								<option key={student.id} value={student.id}>
									{student.fullName}
								</option>
							))}
						</select>
					</div>
					<div>
						<label>Miqdor</label>
						<input
							type='number'
							value={form.amount}
							onChange={e =>
								setForm({ ...form, amount: Number(e.target.value) })
							}
						/>
					</div>
					<div>
						<label>Usul</label>
						<select
							value={form.method}
							onChange={e => setForm({ ...form, method: e.target.value })}
						>
							<option value='manual'>Naqd pul</option>
							<option value='click'>Click</option>
							<option value='payme'>Payme</option>
						</select>
					</div>
				</div>
				<div className='modal-actions'>
					<button type='button' className='ghost-outline' onClick={onClose}>
						Bekor qilish
					</button>
					<ActionButton type='submit'>To'lovni saqlash</ActionButton>
				</div>
			</form>
		</Modal>
	)
}

function ReceptionStudentsPage({ token, meta }) {
	const [searchParams] = useSearchParams()
	const [search, setSearch] = useState('')
	const [status, setStatus] = useState('')
	const [includeArchived, setIncludeArchived] = useState(false)
	const { students, reload } = useReceptionData(token, {
		search: '',
		status: '',
		includeArchived: false,
	})
	const [studentModal, setStudentModal] = useState(null)
	const [paymentModal, setPaymentModal] = useState(null)
	const [historyModal, setHistoryModal] = useState(null)

	useEffect(() => {
		const searchFromUrl = searchParams.get('search') || ''
		setSearch(searchFromUrl)
		reload({ search: searchFromUrl, status, includeArchived })
	}, [searchParams])

	const emptyForm = {
		fullName: '',
		phone: '',
		courseId: meta.courses[0]?.id || '',
		teacherId: meta.teachers[0]?.id || '',
		balance: 0,
		lastPaymentDate: '',
	}

	async function submitStudent(event, form) {
		event.preventDefault()
		try {
			if (form.id) {
				await api.updateStudent(token, form.id, form)
				await showSuccess('Yangilandi', "O'quvchi ma'lumotlari saqlandi")
			} else {
				await api.createStudent(token, form)
				await showSuccess(
					'Qo‘shildi',
					"Yangi o'quvchi muvaffaqiyatli qo'shildi",
				)
			}
			setStudentModal(null)
			reload({ search, status, includeArchived })
		} catch (err) {
			await showError(err.message)
		}
	}

	async function submitPayment(event, form) {
		event.preventDefault()
		try {
			const response = await api.createPayment(token, form)
			setPaymentModal(null)
			reload({ search, status, includeArchived })
			await Swal.fire({
				icon: 'success',
				title: "To'lov qabul qilindi",
				html: `
					<div style="text-align:left;line-height:1.7">
						<div><strong>F.I.Sh:</strong> ${response.receipt.fullName}</div>
						<div><strong>Telefon:</strong> ${response.receipt.phone || '-'}</div>
						<div><strong>Summa:</strong> ${formatMoney(response.receipt.amount)}</div>
						<div><strong>Sana:</strong> ${response.receipt.paidAt}</div>
					</div>
				`,
				confirmButtonColor: '#133385',
			})
		} catch (err) {
			await showError(err.message)
		}
	}

	async function handleDelete(studentId) {
		const result = await Swal.fire({
			icon: 'warning',
			title: "O'quvchini o'chirasizmi?",
			showCancelButton: true,
			confirmButtonText: "Ha, o'chirish",
			cancelButtonText: 'Bekor qilish',
			confirmButtonColor: '#dc2626',
		})
		if (!result.isConfirmed) return
		await api.deleteStudent(token, studentId)
		reload({ search, status, includeArchived })
		toast.fire({ icon: 'success', title: "O'quvchi o'chirildi" })
	}

	async function handleArchive(studentId) {
		await api.archiveStudent(token, studentId)
		reload({ search, status, includeArchived })
		toast.fire({ icon: 'success', title: 'Student arxivlandi' })
	}

	async function handleHistory(studentId) {
		const history = await api.getStudentHistory(token, studentId)
		setHistoryModal(history)
	}

	async function handleRegisterLink(studentId) {
		try {
			const data = await api.createStudentRegisterToken(token, studentId)
			const result = await Swal.fire({
				title: 'Student registratsiya havolasi',
				html: `
					<div class="register-link-preview">
						<img class="register-link-qr" src="${getQrPreviewUrl(data.registerUrl)}" alt="QR code" />
						<div class="register-link-body">
							<div class="register-link-meta"><strong>Token:</strong> ${data.token}</div>
							<div class="register-link-meta"><strong>Muddati:</strong> ${data.expiresAt}</div>
							<a class="register-link-anchor" href="${data.registerUrl}" target="_blank" rel="noreferrer">${data.registerUrl}</a>
						</div>
					</div>
				`,
				showDenyButton: true,
				denyButtonText: 'Linkni nusxalash',
				confirmButtonText: 'Yopish',
				confirmButtonColor: '#133385',
				denyButtonColor: '#1c91d3',
				width: 640,
			})
			if (result.isDenied) {
				await copyText(data.registerUrl)
				toast.fire({ icon: 'success', title: 'Registratsiya linki nusxalandi' })
			}
		} catch (err) {
			await showError(err.message)
		}
	}

	return (
		<>
			<PageHeader
				title="O'quvchilar ro'yxati"
				actions={
					<>
						<ActionButton
							icon='person_add'
							onClick={() => setStudentModal(emptyForm)}
						>
							Yangi o'quvchi
						</ActionButton>
						<ActionButton
							secondary
							icon='account_balance_wallet'
							onClick={() =>
								setPaymentModal({ studentId: '', amount: '', method: 'manual' })
							}
						>
							To'lov qabul qilish
						</ActionButton>
					</>
				}
			/>

			<section className='toolbar-card'>
				<div className='filter-chips'>
					{[
						{ key: '', label: 'Barchasi' },
						{ key: 'trial', label: 'Sinovdagilar' },
						{ key: 'active', label: 'Faol' },
						{ key: 'debtor', label: 'Qarzdorlar' },
					].map(item => (
						<button
							key={item.key}
							type='button'
							className={status === item.key ? 'chip active' : 'chip'}
							onClick={() => {
								setStatus(item.key)
								reload({ search, status: item.key, includeArchived })
							}}
						>
							{item.label}
						</button>
					))}
				</div>

				<div className='toolbar-right'>
					<input
						className='toolbar-search'
						placeholder="Ism, telefon yoki kurs bo'yicha qidiring..."
						value={search}
						onChange={event => setSearch(event.target.value)}
					/>
				</div>
			</section>

			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>O'quvchi</th>
								<th>Kontakt</th>
								<th>Kurs va O'qituvchi</th>
								<th>Balans</th>
								<th>Status</th>
								<th>Amallar</th>
							</tr>
						</thead>
						<tbody>
							{students.map((student, index) => (
								<tr key={student.id}>
									<td data-label="Kurs va O'qituvchi">
										<div className='student-identity'>
											<div className={`avatar-badge tone-${index % 5}`}>
												{getInitials(student.fullName)}
											</div>
											<div>
												<strong>{student.fullName}</strong>
												<span>ID: {student.id}</span>
											</div>
										</div>
									</td>
									<td data-label='Balans'>
										<div className='contact-cell'>
											<strong>{student.phone}</strong>
											<span>
												{student.telegramId
													? `Telegram ulangan: ${student.telegramId}`
													: 'Telegram ulanmagan'}
											</span>
										</div>
									</td>
									<td data-label='Status'>
										<div className='course-cell'>
											<strong>{student.courseTitle}</strong>
											<span>{student.teacherName}</span>
										</div>
									</td>
									<td data-label='Amallar'>
										<span
											className={
												student.status === 'active'
													? 'money-chip positive'
													: student.status === 'trial'
														? 'money-chip neutral'
														: 'money-chip negative'
											}
										>
											{student.status === 'active'
												? '+'
												: student.status === 'trial'
													? ''
													: '-'}
											{formatMoney(Math.abs(student.balance))}
										</span>
									</td>
									<td>
										<div className='course-cell'>
											<Badge tone={getStudentStatusMeta(student.status).tone}>
												{getStudentStatusMeta(student.status).label}
											</Badge>
											{student.status === 'trial' ? (
												<span>
													{student.trialProgress || 0}/
													{student.trialRequired || 3} kun
													{student.paymentDueDate
														? ` · Muddat: ${student.paymentDueDate}`
														: ''}
												</span>
											) : student.paymentDueDate ? (
												<span>To'lov muddati: {student.paymentDueDate}</span>
											) : null}
										</div>
									</td>
									<td>
										<div className='table-actions'>
											<button
												type='button'
												onClick={() => setStudentModal({ ...student })}
											>
												<Icon name='edit' />
											</button>
											<button
												type='button'
												onClick={() => handleHistory(student.id)}
											>
												<Icon name='history' />
											</button>
											<button
												type='button'
												onClick={() => handleRegisterLink(student.id)}
											>
												<Icon name='qr_code_2' />
											</button>
											<button
												type='button'
												onClick={() =>
													setPaymentModal({
														studentId: student.id,
														amount: '',
														method: 'manual',
													})
												}
											>
												<Icon name='person_add' />
											</button>
											{/* <button
												type='button'
												onClick={() => handleArchive(student.id)}
											>
												<Icon name='archive' />
											</button> */}
											<button
												type='button'
												onClick={() => handleDelete(student.id)}
											>
												<Icon name='delete' />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className='table-footer'>
					<span>{students.length} ta student ko'rsatildi</span>
					<div className='pagination'>
						<button type='button' className='page-btn muted'>
							<Icon name='chevron_left' /> Oldingi
						</button>
						<button type='button' className='page-btn'>
							Keyingi <Icon name='chevron_right' />
						</button>
					</div>
				</div>
			</section>

			{studentModal ? (
				<StudentFormModal
					meta={meta}
					initialData={studentModal}
					onClose={() => setStudentModal(null)}
					onSubmit={submitStudent}
				/>
			) : null}

			{paymentModal ? (
				<PaymentModal
					students={students}
					initialData={paymentModal}
					onClose={() => setPaymentModal(null)}
					onSubmit={submitPayment}
				/>
			) : null}
			{historyModal ? (
				<StudentHistoryModal
					history={historyModal}
					onClose={() => setHistoryModal(null)}
				/>
			) : null}
		</>
	)
}

function ReceptionDashboardPage({ token }) {
	const { students } = useReceptionData(token, { search: '', status: '' })
	const [payments] = usePaymentsData(token)

	const active = students.filter(student => student.status === 'active').length
	const debtors = students.filter(student => student.status === 'debtor').length
	const trial = students.filter(student => student.status === 'trial').length
	const paymentTrend = useMemo(() => {
		const buckets = {}
		payments.slice(0, 14).reverse().forEach(payment => {
			const key = String(payment.createdAt || '').slice(5, 10)
			buckets[key] = (buckets[key] || 0) + Number(payment.amount || 0)
		})
		return Object.entries(buckets).map(([label, value]) => ({ label, value })).slice(-6)
	}, [payments])

	return (
		<>
			<PageHeader
				title='Bosh sahifa'
				subtitle="Reception umumiy boshqaruv ko'rinishi"
			/>
			<div className='three-column-grid'>
				<StatCard
					label='Jami studentlar'
					value={`${students.length} ta`}
					note={`${active} ta faol`}
					icon='group'
				/>
				<StatCard
					label='Sinovdagilar'
					value={`${trial} ta`}
					note="3 ta o'qish kuni kuzatuvda"
					icon='hourglass_top'
				/>
				<StatCard
					label='Qarzdorlar'
					value={`${debtors} ta`}
					note='Faol nazorat talab etiladi'
					tone='danger'
					icon='warning'
				/>
				<StatCard
					label="Bugungi to'lovlar"
					value={`${payments.length} ta`}
					note='Oxirgi tranzaksiyalar tayyor'
					icon='payments'
				/>
			</div>
			<section className='card'>
				<h3>Oxirgi harakatlar</h3>
				{paymentTrend.length ? (
					<div className='dashboard-trend-block'>
						<div className='dashboard-trend-head'>
							<strong>To'lov trendi</strong>
							<span>Oxirgi kunlar kesimida</span>
						</div>
						<MiniTrendChart items={paymentTrend} valueKey='value' labelKey='label' tone='navy' />
					</div>
				) : null}
				<div className='timeline-list'>
					{payments.slice(0, 5).map(payment => (
						<div key={payment.id} className='timeline-item'>
							<strong>{payment.studentName}</strong>
							<span>
								{formatMoney(payment.amount)} - {getPaymentMethodMeta(payment.method).shortLabel}
							</span>
						</div>
					))}
				</div>
			</section>
		</>
	)
}

function ReceptionPaymentsPage({ token }) {
	const [payments] = usePaymentsData(token)

	return (
		<>
			<PageHeader
				title="To'lovlar"
				subtitle="Barcha qabul qilingan to'lovlar ro'yxati"
			/>
			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>O'quvchi</th>
								<th>Kurs</th>
								<th>Miqdor</th>
								<th>Usul</th>
								<th>Sana</th>
							</tr>
						</thead>
						<tbody>
							{payments.map(payment => (
								<tr key={payment.id}>
									<td data-label="O'quvchi">{payment.studentName}</td>
									<td data-label='Kurs'>{payment.courseTitle}</td>
									<td data-label='Miqdor' className='amount-cell'>{formatMoney(payment.amount)}</td>
									<td data-label='Usul'>{getPaymentMethodMeta(payment.method).shortLabel}</td>
									<td data-label='Sana'>{payment.createdAt}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function ReceptionContactRequestsPage({ token }) {
	const [items, setItems] = useState([])

	async function load() {
		const data = await api.getReceptionContactRequests(token)
		setItems(data)
	}

	useEffect(() => {
		load()
	}, [token])

	async function handleRead(id) {
		await api.readReceptionContactRequest(token, id)
		load()
	}

	return (
		<>
			<PageHeader
				title="Bog'lanish"
				subtitle="Asosiy sahifadagi murojaatlar reception paneliga tushadi"
			/>
			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>F.I.Sh</th>
								<th>Telefon</th>
								<th>Xabar</th>
								<th>Holat</th>
								<th>Sana</th>
								<th>Amal</th>
							</tr>
						</thead>
						<tbody>
							{items.map(item => (
								<tr key={item.id}>
									<td data-label='F.I.Sh'>{item.fullName}</td>
									<td data-label='Telefon'>{item.phone}</td>
									<td data-label='Xabar'>{item.message}</td>
									<td data-label='Holat'>
										<Badge tone={item.status === 'new' ? 'warning' : 'success'}>
											{item.status === 'new' ? 'Yangi' : "Ko'rildi"}
										</Badge>
									</td>
									<td data-label='Sana'>{item.createdAt}</td>
									<td data-label='Amal'>
										{item.status === 'new' ? (
											<button type='button' className='page-btn' onClick={() => handleRead(item.id)}>
												Ko'rildi
											</button>
										) : (
											<span className='muted-label'>Tayyor</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function ReceptionAttendancePage({ token }) {
	const { students } = useReceptionData(token, { search: '', status: '' })
	return (
		<>
			<PageHeader
				title='Davomat nazorati'
				subtitle='Student holatlari va qarzdorlik kesimi'
			/>
			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>O'quvchi</th>
								<th>Kurs</th>
								<th>O'qituvchi</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{students.map(student => (
								<tr key={student.id}>
									<td data-label="O'quvchi">{student.fullName}</td>
									<td data-label='Kurs'>{student.courseTitle}</td>
									<td data-label="O'qituvchi">{student.teacherName}</td>
									<td data-label='Status'>
										<Badge tone={getStudentStatusMeta(student.status).tone}>
											{getStudentStatusMeta(student.status).label}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function ReceptionSettingsPage({ meta, token, onProfileUpdated }) {
	return (
		<>
			<PageHeader
				title='Sozlamalar'
				subtitle='Reception profili va akkaunt sozlamalari'
			/>
			<ProfileSettingsCard
				token={token}
				meta={meta}
				title='Reception profili'
				onProfileUpdated={onProfileUpdated}
			/>
		</>
	)
}

function useTeacherStudents(token) {
	const [students, setStudents] = useState([])
	const reload = async () => {
		const data = await api.getTeacherStudents(token)
		setStudents(data)
	}
	useEffect(() => {
		reload()
	}, [token])
	return { students, reload }
}

function TeacherAttendancePage({ token }) {
	const { students, reload } = useTeacherStudents(token)
	const groups = useMemo(() => {
		const map = new Map()
		students.forEach(student => {
			const key = student.courseTitle || "Noma'lum guruh"
			if (!map.has(key)) map.set(key, [])
			map.get(key).push(student)
		})
		return Array.from(map.entries()).map(([name, members]) => ({
			name,
			members,
		}))
	}, [students])
	const [selectedGroup, setSelectedGroup] = useState('')
	const [attendanceMap, setAttendanceMap] = useState({})

	useEffect(() => {
		if (!selectedGroup && groups[0]) {
			setSelectedGroup(groups[0].name)
		}
	}, [groups, selectedGroup])

	const currentGroup = groups.find(group => group.name === selectedGroup) ||
		groups[0] || { members: [] }
	const currentSchedule =
		currentGroup.members[0]?.schedule || 'Jadval kiritilmagan'

	async function saveAttendance() {
		for (const student of currentGroup.members) {
			const present = attendanceMap[student.id] ?? true
			await api.saveAttendance(token, {
				studentId: student.id,
				status: present ? 'present' : 'absent',
			})
		}
		await reload()
	}

	return (
		<>
			<section className='teacher-header'>
				<div>
					<h1>Bugungi Davomat</h1>
					<p>{formatDateLabel()}</p>
				</div>
				<div className='group-switcher'>
					<button type='button'>
						<Icon name='chevron_left' />
					</button>
					<select
						value={selectedGroup}
						onChange={e => setSelectedGroup(e.target.value)}
					>
						{groups.map(group => (
							<option key={group.name} value={group.name}>
								Guruh: {group.name}
							</option>
						))}
					</select>
					<button type='button'>
						<Icon name='chevron_right' />
					</button>
				</div>
			</section>

			<div className='teacher-stats'>
				<section className='card mini-stat-card'>
					<div className='mini-stat-icon'>
						<Icon name='group' />
					</div>
					<div>
						<span>Jami o'quvchilar</span>
						<strong>{students.length}</strong>
					</div>
				</section>
				<section className='card mini-stat-card'>
					<div className='mini-stat-icon green'>
						<Icon name='trending_up' />
					</div>
					<div>
						<span>O'rtacha davomat</span>
						<strong>
							{students.length
								? Math.round(
										students.reduce(
											(sum, student) => sum + student.attendancePercent,
											0,
										) / students.length,
									)
								: 0}
							%
						</strong>
					</div>
				</section>
				<section className='next-lesson-card'>
					<span>Navbatdagi dars</span>
					<strong>{selectedGroup || 'Guruh tanlanmagan'}</strong>
					<p>{currentSchedule}</p>
				</section>
			</div>

			<section className='card attendance-card'>
				<div className='card-head-row'>
					<h3>{selectedGroup} Davomati</h3>
					<span>{currentGroup.members.length} o'quvchi ro'yxatda</span>
				</div>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>O'QUVCHI F.I.SH</th>
								<th>STATUS</th>
								<th>KELDI / KELMADI</th>
							</tr>
						</thead>
						<tbody>
							{currentGroup.members.map((student, index) => {
								const current = attendanceMap[student.id] ?? true
								return (
									<tr key={student.id}>
										<td data-label="O'quvchi">
											<div className='student-identity'>
												<div className={`avatar-badge tone-${index % 5}`}>
													{getInitials(student.fullName)}
												</div>
												<strong>{student.fullName}</strong>
											</div>
										</td>
										<td data-label='Status'>
											<Badge tone={current ? 'success' : 'gray'}>
												{current ? 'FAOL' : 'SABABLI'}
											</Badge>
										</td>
										<td data-label='Keldi / Kelmadi'>
											<label className='attendance-checkbox'>
												<input
													type='checkbox'
													checked={current}
													onChange={() =>
														setAttendanceMap({
															...attendanceMap,
															[student.id]: !current,
														})
													}
												/>
												<span className='attendance-checkbox-ui' />
											</label>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
				<div className='attendance-footer'>
					<span>Ma'lumotlarni saqlashdan oldin qayta tekshiring</span>
					<div className='attendance-actions'>
						<button type='button' className='text-link'>
							Bekor qilish
						</button>
						<ActionButton icon='save' onClick={saveAttendance}>
							Saqlash
						</ActionButton>
					</div>
				</div>
			</section>
		</>
	)
}

function TeacherGroupsPage({ token }) {
	const { students } = useTeacherStudents(token)
	const groups = useMemo(() => {
		const map = new Map()
		students.forEach(student => {
			const key = student.courseTitle || "Noma'lum guruh"
			if (!map.has(key)) map.set(key, [])
			map.get(key).push(student)
		})
		return Array.from(map.entries()).map(([name, members]) => ({
			name,
			members,
		}))
	}, [students])

	return (
		<>
			<PageHeader
				title='Mening Guruhlarim'
				subtitle="Barcha guruhlar va davomat ko'rsatkichlari"
			/>
			<div className='group-cards'>
				{groups.map((group, index) => {
					const avg = group.members.length
						? Math.round(
								group.members.reduce(
									(sum, item) => sum + item.attendancePercent,
									0,
								) / group.members.length,
							)
						: 0
					return (
						<div key={group.name} className='card group-card'>
							<div className='group-card-top'>
								<div>
									<strong>{group.name}</strong>
									<span>{group.members.length} o'quvchi</span>
								</div>
								<div className='group-card-icon'>
									<Icon name={index % 2 === 0 ? 'menu_book' : 'architecture'} />
								</div>
							</div>
							<div className='progress-meta'>
								<span>Davomat ko'rsatkichi</span>
								<strong>{avg}%</strong>
							</div>
							<div className='progress-bar'>
								<span
									style={{ width: `${avg}%` }}
									className={avg > 80 ? 'good' : 'warn'}
								/>
							</div>
						</div>
					)
				})}
			</div>
		</>
	)
}

function TeacherDashboardPage({ token }) {
	const { students } = useTeacherStudents(token)
	const [history, setHistory] = useState([])
	const groupsCount = new Set(students.map(student => student.courseTitle)).size
	useEffect(() => {
		api.getTeacherAttendanceHistory(token, 'month').then(setHistory)
	}, [token])
	const attendanceTrend = useMemo(() => {
		const buckets = {}
		history.slice(0, 18).reverse().forEach(item => {
			const key = String(item.lessonDate || '').slice(5, 10)
			if (!buckets[key]) buckets[key] = { label: key, value: 0, total: 0 }
			buckets[key].total += 1
			if (item.status === 'present') buckets[key].value += 1
		})
		return Object.values(buckets)
			.map(item => ({
				label: item.label,
				value: item.total ? Math.round((item.value / item.total) * 100) : 0,
			}))
			.slice(-6)
	}, [history])
	return (
		<>
			<PageHeader
				title='Dashboard'
				subtitle="O'qituvchi uchun umumiy ko'rinish"
			/>
			<div className='three-column-grid'>
				<StatCard
					label='Studentlar'
					value={`${students.length} ta`}
					note={`${groupsCount} ta guruh`}
					icon='group'
				/>
				<StatCard
					label='Davomat'
					value={`${students.length ? Math.round(students.reduce((sum, item) => sum + item.attendancePercent, 0) / students.length) : 0}%`}
					note="Joriy ko'rsatkich"
					icon='event_available'
				/>
				<StatCard
					label='Bugungi darslar'
					value='3 ta'
					note='Hammasi jadval asosida'
					icon='schedule'
				/>
			</div>
			{attendanceTrend.length ? (
				<section className='card'>
					<div className='dashboard-trend-head'>
						<strong>Davomat trendi</strong>
						<span>Oxirgi darslar kesimida foiz</span>
					</div>
					<MiniTrendChart items={attendanceTrend} valueKey='value' labelKey='label' tone='green' />
				</section>
			) : null}
		</>
	)
}

function TeacherStatisticsPage({ token }) {
	const { students } = useTeacherStudents(token)
	const [history, setHistory] = useState([])

	useEffect(() => {
		api.getTeacherAttendanceHistory(token, 'month').then(setHistory)
	}, [token])

	return (
		<>
			<PageHeader
				title='Statistika'
				subtitle='Davomat va guruh samaradorligi'
			/>
			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>Student</th>
								<th>Kurs</th>
								<th>Davomat</th>
							</tr>
						</thead>
						<tbody>
							{students.map(student => (
								<tr key={student.id}>
									<td data-label='Student'>{student.fullName}</td>
									<td data-label='Kurs'>{student.courseTitle}</td>
									<td data-label='Davomat' className='amount-cell'>{student.attendancePercent}%</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
			<section className='card table-card'>
				<div className='card-head-row'>
					<h3>Davomat tarixi</h3>
					<p>So'nggi 30 kunlik yozuvlar</p>
				</div>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>Sana</th>
								<th>Student</th>
								<th>Kurs</th>
								<th>Holat</th>
							</tr>
						</thead>
						<tbody>
							{history.map(item => (
								<tr key={item.id}>
									<td data-label='Sana'>{item.lessonDate}</td>
									<td data-label='Student'>{item.studentName}</td>
									<td data-label='Kurs'>{item.courseTitle}</td>
									<td data-label='Holat'>
										<Badge
											tone={item.status === 'present' ? 'success' : 'danger'}
										>
											{item.status === 'present' ? 'Keldi' : 'Kelmadi'}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function TeacherSettingsPage({ meta, token, onProfileUpdated }) {
	return (
		<>
			<PageHeader title='Sozlamalar' subtitle="O'qituvchi profili" />
			<ProfileSettingsCard
				token={token}
				meta={meta}
				title="O'qituvchi profili"
				onProfileUpdated={onProfileUpdated}
			/>
		</>
	)
}

function DirectorDashboardPage({ token }) {
	const [data, setData] = useState(null)
	const [chartPeriod, setChartPeriod] = useState('monthly')
	const [dateRange, setDateRange] = useState({ from: '', to: '' })
	const [hoveredPoint, setHoveredPoint] = useState(null)
	useEffect(() => {
		api.getDirectorOverview(token).then(setData)
	}, [token])

	if (!data) return <div className='card'>Analitika yuklanmoqda...</div>
	const trendSets = data.trends || {
		daily: [],
		weekly: [],
		monthly: data.monthlyRevenue || [],
	}
	const baseChartData = trendSets[chartPeriod]?.length
		? trendSets[chartPeriod]
		: trendSets.monthly || []
	const chartData = baseChartData.filter(item => {
		if (chartPeriod === 'daily') {
			return isDateInRange(item.startDate, dateRange.from, dateRange.to)
		}
		const startOk = !dateRange.from || item.endDate >= dateRange.from
		const endOk = !dateRange.to || item.startDate <= dateRange.to
		return startOk && endOk
	})
	const maxRevenue = Math.max(...chartData.map(item => item.revenue), 1)
	const totalRevenue = chartData.reduce(
		(sum, item) => sum + Number(item.revenue || 0),
		0,
	)
	const averageRevenue = chartData.length
		? Math.round(totalRevenue / chartData.length)
		: 0
	const peakRevenue = chartData.length
		? Math.max(...chartData.map(item => Number(item.revenue || 0)))
		: 0
	const currentRevenue = Number(chartData[chartData.length - 1]?.revenue || 0)
	const previousRevenue = Number(chartData[chartData.length - 2]?.revenue || 0)
	const growthPercent =
		previousRevenue > 0
			? `${Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)}%`
			: 'Yangi davr'
	const chartSubtitleMap = {
		daily: "Oxirgi 7 kunlik moliyaviy o'sish ko'rsatkichlari",
		weekly: "Oxirgi 8 haftalik moliyaviy o'sish ko'rsatkichlari",
		monthly: "Oxirgi 6 oylik moliyaviy o'sish ko'rsatkichlari",
	}
	const summaryLabelMap = {
		daily: "O'RTACHA KUNLIK",
		weekly: "O'RTACHA HAFTALIK",
		monthly: "O'RTACHA OYLIK",
	}
	const peakLabelMap = {
		daily: 'ENG YUQORI KUN',
		weekly: 'ENG YUQORI HAFTA',
		monthly: 'ENG YUQORI OY',
	}
	const totalLabelMap = {
		daily: '7 KUNLIK JAMI',
		weekly: '8 HAFTALIK JAMI',
		monthly: '6 OYLIK JAMI',
	}
	const chartPoints = chartData.length
		? chartData
				.map((item, index) => {
					const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100
					const y = 100 - (Number(item.revenue || 0) / maxRevenue) * 100
					return `${x},${Math.max(6, y)}`
				})
				.join(' ')
		: ''

	async function handleExport(type) {
		const blob = await api.exportReport(token, type, 'xlsx', {
			period: chartPeriod,
			from: dateRange.from,
			to: dateRange.to,
		})
		downloadBlobFile('intelligent-report.xlsx', blob)
	}

	async function handlePrint() {
		const blob = await api.exportReport(token, 'overview', 'pdf', {
			period: chartPeriod,
			from: dateRange.from,
			to: dateRange.to,
		})
		downloadBlobFile('intelligent-report.pdf', blob)
	}

	return (
		<>
			<PageHeader
				title='Direktor Paneli'
				subtitle="Markaz ko'rsatkichlarini boshqarish va tahlil qilish."
				actions={
					<>
						<ActionButton
							secondary
							icon='file_download'
							onClick={() => handleExport('overview')}
						>
							Excel
						</ActionButton>
						<ActionButton secondary icon='picture_as_pdf' onClick={handlePrint}>
							PDF
						</ActionButton>
						<Link to='/director/students' className='action-btn link-btn'>
							<Icon name='add' className='button-icon' />
							Yangi o'quvchi
						</Link>
					</>
				}
			/>

			<div className='director-kpis'>
				<StatCard
					label='OYLIK TUSHUM'
					value={formatMoney(data.cards.monthlyRevenue)}
					note={`${growthPercent} o'tgan oyga nisbatan`}
					icon='payments'
				/>
				<StatCard
					label="O'QUVCHILAR SONI"
					value={`${data.cards.totalStudents} ta`}
					note={`${data.cards.trialStudentsCount || 0} ta sinovda`}
					icon='group'
				/>
				<StatCard
					label='SINOVDAGILAR'
					value={`${data.cards.trialStudentsCount || 0} ta`}
					note="3 ta o'qish kuni kuzatilmoqda"
					icon='hourglass_top'
				/>
				<StatCard
					label='QARZDORLAR'
					value={`${data.cards.debtorsCount} ta`}
					note='Faol nazorat talab etiladi'
					tone='danger'
					icon='money_off'
				/>
			</div>

			<section className='card chart-card'>
				<div className='card-head-row'>
					<div>
						<h3>Tushumlar dinamikasi</h3>
						<p>{chartSubtitleMap[chartPeriod]}</p>
					</div>
					<div className='segmented-switch'>
						<button
							type='button'
							className={chartPeriod === 'daily' ? 'active' : ''}
							onClick={() => setChartPeriod('daily')}
						>
							Kunlik
						</button>
						<button
							type='button'
							className={chartPeriod === 'weekly' ? 'active' : ''}
							onClick={() => setChartPeriod('weekly')}
						>
							Haftalik
						</button>
						<button
							type='button'
							className={chartPeriod === 'monthly' ? 'active' : ''}
							onClick={() => setChartPeriod('monthly')}
						>
							Oylik
						</button>
					</div>
				</div>
				<div className='chart-filter-row'>
					<label>
						<span>Dan</span>
						<input
							type='date'
							value={dateRange.from}
							onChange={event =>
								setDateRange(current => ({ ...current, from: event.target.value }))
							}
						/>
					</label>
					<label>
						<span>Gacha</span>
						<input
							type='date'
							value={dateRange.to}
							onChange={event =>
								setDateRange(current => ({ ...current, to: event.target.value }))
							}
						/>
					</label>
					<button
						type='button'
						className='mini-pill'
						onClick={() => setDateRange({ from: '', to: '' })}
					>
						Filterni tozalash
					</button>
				</div>

				<div className='revenue-chart-wrap'>
					{hoveredPoint ? (
						<div
							className='chart-tooltip'
							style={{
								left: `${hoveredPoint.left}px`,
								top: `${hoveredPoint.top}px`,
							}}
						>
							<strong>{hoveredPoint.label}</strong>
							<span>{formatMoney(hoveredPoint.value)}</span>
						</div>
					) : null}
					{chartData.length ? (
						<svg
							className='revenue-line-overlay'
							viewBox='0 0 100 100'
							preserveAspectRatio='none'
						>
							<polyline points={chartPoints} />
							{chartData.map((item, index) => {
								const x = chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100
								const y = 100 - (Number(item.revenue || 0) / maxRevenue) * 100
								return <circle key={item.period || index} cx={x} cy={Math.max(6, y)} r='2.8' />
							})}
						</svg>
					) : null}
					<div className='revenue-chart'>
					{chartData.map((item, index) => (
						<div
							key={`${item.period || item.label}-${index}`}
							className='revenue-column'
							onMouseEnter={event => {
								const rect = event.currentTarget.getBoundingClientRect()
								const parentRect = event.currentTarget.parentElement.getBoundingClientRect()
								setHoveredPoint({
									label: item.label || item.period,
									value: item.revenue,
									left: rect.left - parentRect.left + rect.width / 2,
									top: rect.top - parentRect.top - 12,
								})
							}}
							onMouseLeave={() => setHoveredPoint(null)}
						>
							<div className='revenue-bar-value'>{formatMoney(item.revenue)}</div>
							<div
								className={
									index === chartData.length - 1
										? 'revenue-bar active'
										: 'revenue-bar'
								}
								style={{
									height: `${Math.max((item.revenue / maxRevenue) * 240, 36)}px`,
								}}
							/>
							<span>{item.label || item.period}</span>
						</div>
					))}
					</div>
				</div>

				<div className='chart-summary'>
					<div className='summary-mini'>
						<span>{summaryLabelMap[chartPeriod]}</span>
						<strong>{formatMoney(averageRevenue)}</strong>
					</div>
					<div className='summary-mini'>
						<span>{peakLabelMap[chartPeriod]}</span>
						<strong>{formatMoney(peakRevenue)}</strong>
					</div>
					<div className='summary-mini'>
						<span>{totalLabelMap[chartPeriod]}</span>
						<strong>{formatMoney(totalRevenue)}</strong>
					</div>
					<div className='summary-mini'>
						<span>PROGNOZ</span>
						<strong>{growthPercent}</strong>
					</div>
				</div>
			</section>

			<section className='card analytics-card'>
				<div className='card-head-row'>
					<div>
						<h3>Yo'nalishlar bo'yicha tahlil</h3>
						<p>Kurslar va guruhlar samaradorligi</p>
					</div>
					<Link to='/director/statistics' className='mini-pill link-btn'>
						To'liq hisobot
					</Link>
				</div>

				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>YO'NALISH</th>
								<th>GURUHLAR</th>
								<th>O'QUVCHILAR</th>
								<th>TUSHUM</th>
								<th>SAMARADORLIK</th>
							</tr>
						</thead>
						<tbody>
							{data.courseAnalysis.map((course, index) => (
								<tr key={course.id}>
									<td data-label="Yo'nalish">
										<div className='course-analytics-name'>
											<div className={`course-icon tone-${index % 4}`}>
												{['EN', 'MT', 'WD', 'IT'][index % 4]}
											</div>
											<div>
												<strong>{course.title}</strong>
												<span>
													{index === 0
														? "Asosiy yo'nalish"
														: index === 1
															? 'Akademik tayyorlov'
															: "IT yo'nalishi"}
												</span>
											</div>
										</div>
									</td>
									<td data-label='Guruhlar'>{course.groupsCount} ta</td>
									<td data-label="O'quvchilar">{course.studentsCount} ta</td>
									<td data-label='Tushum' className='amount-cell'>{formatMoney(course.revenue)}</td>
									<td
										data-label='Samaradorlik'
										className={
											course.efficiency >= 85 ? 'success-text' : 'warning-text'
										}
									>
										{course.efficiency}%
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function DirectorStudentsPage({ token }) {
	const [searchParams] = useSearchParams()
	const searchFromUrl = searchParams.get('search') || ''
	const { students } = useReceptionData(token, {
		search: searchFromUrl,
		status: '',
	})
	return (
		<>
			<PageHeader
				title="O'quvchilar"
				subtitle="Barcha studentlar bo'yicha umumiy nazorat"
			/>
			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>O'quvchi</th>
								<th>Kurs</th>
								<th>O'qituvchi</th>
								<th>Balans</th>
								<th>Status</th>
								<th>To'lov muddati</th>
							</tr>
						</thead>
						<tbody>
							{students.map(student => (
								<tr key={student.id}>
									<td data-label="O'quvchi">{student.fullName}</td>
									<td data-label='Kurs'>{student.courseTitle}</td>
									<td data-label="O'qituvchi">{student.teacherName}</td>
									<td data-label='Balans' className='amount-cell'>
										{formatMoney(student.balance)}
									</td>
									<td data-label='Status'>
										<Badge tone={getStudentStatusMeta(student.status).tone}>
											{getStudentStatusMeta(student.status).label}
										</Badge>
									</td>
									<td data-label="To'lov muddati">
										{student.status === 'trial'
											? `${student.trialProgress || 0}/${student.trialRequired || 3} kun`
											: student.paymentDueDate || '-'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function DirectorPaymentsPage({ token }) {
	const [payments] = usePaymentsData(token)
	const [finance, setFinance] = useState(null)

	useEffect(() => {
		api.getDirectorFinance(token).then(setFinance)
	}, [token])

	return (
		<>
			<PageHeader
				title="To'lovlar"
				subtitle='Barcha tranzaksiyalar va oqimlar'
			/>
			{finance ? (
				<div className='three-column-grid'>
					<StatCard
						label='Bugungi tushum'
						value={formatMoney(finance.totals.todayRevenue)}
						note='Bugungi kassa'
						icon='payments'
					/>
					<StatCard
						label='Qarz summasi'
						value={formatMoney(finance.debtors.debtAmount)}
						note={`${finance.debtors.debtorsCount} ta qarzdor`}
						tone='danger'
						icon='warning'
					/>
					<StatCard
						label='Oylik tushum'
						value={formatMoney(finance.totals.monthlyRevenue)}
						note='Joriy oy'
						icon='leaderboard'
					/>
				</div>
			) : null}
			<section className='card table-card'>
				{finance ? (
					<div className='analytics-panels analytics-panels-tight'>
						<div className='analytics-panel'>
							<div className='card-head-row compact'>
								<h3>To'lov usullari</h3>
								<span className='mini-meta'>Qaysi kanal ko'proq ishlayapti</span>
							</div>
							<div className='metric-chip-grid'>
								{finance.paymentMethods.map(item => (
									<div key={item.method} className='metric-chip-card'>
										<strong>
											<Icon name={getPaymentMethodMeta(item.method).icon} className='inline-icon' />{' '}
											{getPaymentMethodMeta(item.method).label}
										</strong>
										<span>{item.count} ta tranzaksiya</span>
										<b>{formatMoney(item.amount)}</b>
									</div>
								))}
							</div>
						</div>
						<div className='analytics-panel'>
							<div className='card-head-row compact'>
								<h3>Top o'qituvchilar</h3>
								<span className='mini-meta'>Tushum bo'yicha</span>
							</div>
							<div className='timeline-list'>
								{finance.topTeachers.map(teacher => (
									<div key={teacher.id} className='timeline-item'>
										<strong>{teacher.fullName}</strong>
										<span>{formatMoney(teacher.revenue)}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				) : null}
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>O'quvchi</th>
								<th>Kurs</th>
								<th>Miqdor</th>
								<th>Usul</th>
								<th>Sana</th>
							</tr>
						</thead>
						<tbody>
							{payments.map(payment => (
								<tr key={payment.id}>
									<td data-label="O'quvchi">{payment.studentName}</td>
									<td data-label='Kurs'>{payment.courseTitle}</td>
									<td data-label='Miqdor' className='amount-cell'>{formatMoney(payment.amount)}</td>
									<td data-label='Usul'>{getPaymentMethodMeta(payment.method).shortLabel}</td>
									<td data-label='Sana'>{payment.createdAt}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function DirectorAttendancePage({ token }) {
	const { students } = useReceptionData(token, { search: '', status: '' })
	return (
		<>
			<PageHeader title='Davomat' subtitle='Kurslar kesimida student holati' />
			<section className='card table-card'>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>O'quvchi</th>
								<th>Kurs</th>
								<th>O'qituvchi</th>
								<th>Holat</th>
							</tr>
						</thead>
						<tbody>
							{students.map(student => (
								<tr key={student.id}>
									<td data-label="O'quvchi">{student.fullName}</td>
									<td data-label='Kurs'>{student.courseTitle}</td>
									<td data-label="O'qituvchi">{student.teacherName}</td>
									<td data-label='Holat'>{getStudentStatusMeta(student.status).label}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function DirectorStatisticsPage({ token }) {
	const [data, setData] = useState(null)
	const [finance, setFinance] = useState(null)
	useEffect(() => {
		api.getDirectorOverview(token).then(setData)
		api.getDirectorFinance(token).then(setFinance)
	}, [token])
	if (!data) return <div className='card'>Yuklanmoqda...</div>
	return (
		<>
			<PageHeader
				title='Statistika'
				subtitle="Kurslar samaradorligi va KPI ko'rsatkichlari"
			/>
			<div className='three-column-grid'>
				<StatCard
					label='Jami student'
					value={`${data.cards.totalStudents} ta`}
					note='Umumiy bazada'
					icon='group'
				/>
				<StatCard
					label='Qarzdorlar'
					value={`${data.cards.debtorsCount} ta`}
					note='Nazorat ostida'
					tone='danger'
					icon='warning'
				/>
				<StatCard
					label='Oylik tushum'
					value={formatMoney(data.cards.monthlyRevenue)}
					note='Joriy davr'
					icon='payments'
				/>
			</div>
			{finance ? (
				<section className='card table-card'>
					<div className='card-head-row'>
						<h3>Kurslar bo'yicha tushum</h3>
						<p>Finance kesimi</p>
					</div>
					<div className='analytics-panels'>
						<div className='analytics-panel'>
							<h3>Kurslar</h3>
							<div className='timeline-list'>
								{finance.byCourse.map(item => (
									<div key={item.title} className='timeline-item'>
										<strong>{item.title}</strong>
										<span>{formatMoney(item.revenue)}</span>
									</div>
								))}
							</div>
						</div>
						<div className='analytics-panel'>
							<h3>To'lov usullari</h3>
							<div className='metric-chip-grid'>
								{finance.paymentMethods.map(item => (
									<div key={item.method} className='metric-chip-card'>
										<strong>
											<Icon name={getPaymentMethodMeta(item.method).icon} className='inline-icon' />{' '}
											{getPaymentMethodMeta(item.method).label}
										</strong>
										<span>{item.count} ta</span>
										<b>{formatMoney(item.amount)}</b>
									</div>
								))}
							</div>
						</div>
						<div className='analytics-panel'>
							<h3>Top o'qituvchilar</h3>
							<div className='timeline-list'>
								{finance.topTeachers.map(teacher => (
									<div key={teacher.id} className='timeline-item'>
										<strong>{teacher.fullName}</strong>
										<span>{formatMoney(teacher.revenue)}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>
			) : null}
			<section className='card table-card'>
				<div className='card-head-row'>
					<div>
						<h3>Student va o'qituvchi analytics'i</h3>
						<p>Statuslar, qabul oqimi va ustoz samaradorligi</p>
					</div>
				</div>
				<div className='analytics-panels'>
					<div className='analytics-panel'>
						<h3>Student statusi</h3>
						<div className='metric-chip-grid'>
							<div className='metric-chip-card'>
								<strong>Faol</strong>
								<b>{data.studentStatusBreakdown.activeCount || 0} ta</b>
							</div>
							<div className='metric-chip-card warning'>
								<strong>Sinovda</strong>
								<b>{data.studentStatusBreakdown.trialCount || 0} ta</b>
							</div>
							<div className='metric-chip-card danger'>
								<strong>Qarzdor</strong>
								<b>{data.studentStatusBreakdown.debtorCount || 0} ta</b>
							</div>
						</div>
					</div>
					<div className='analytics-panel'>
						<h3>Qabul trendi</h3>
						<div className='mini-bar-grid'>
							{data.admissionsTrend.map(item => (
								<div key={item.period} className='mini-bar-item'>
									<div
										className='mini-bar-fill'
										style={{
											height: `${Math.max(
												28,
												(item.count /
													Math.max(...data.admissionsTrend.map(entry => entry.count), 1)) *
													100,
											)}%`,
										}}
									/>
									<strong>{item.count}</strong>
									<span>{formatPeriodLabel(item.period)}</span>
								</div>
							))}
						</div>
					</div>
				</div>
				<div className='table-shell responsive-cards top-space'>
					<table>
						<thead>
							<tr>
								<th>O'qituvchi</th>
								<th>Student</th>
								<th>Faol</th>
								<th>Sinov</th>
								<th>Qarzdor</th>
								<th>Davomat</th>
								<th>Tushum</th>
							</tr>
						</thead>
						<tbody>
							{data.teacherPerformance.map(teacher => (
								<tr key={teacher.id}>
									<td data-label="O'qituvchi">{teacher.fullName}</td>
									<td data-label='Student'>{teacher.studentsCount} ta</td>
									<td data-label='Faol'>{teacher.activeStudentsCount} ta</td>
									<td data-label='Sinov'>{teacher.trialStudentsCount} ta</td>
									<td data-label='Qarzdor'>{teacher.debtorsCount} ta</td>
									<td data-label='Davomat' className={teacher.attendancePercent >= 80 ? 'success-text' : 'warning-text'}>
										{teacher.attendancePercent}%
									</td>
									<td data-label='Tushum' className='amount-cell'>{formatMoney(teacher.revenue)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</>
	)
}

function DirectorSettingsPage({ meta, token, onProfileUpdated }) {
	const [bundle, setBundle] = useState(null)
	const [courseModal, setCourseModal] = useState(null)
	const [teacherModal, setTeacherModal] = useState(null)

	useEffect(() => {
		api.getSettings(token).then(setBundle)
	}, [token])

	if (!bundle) return <div className='card'>Sozlamalar yuklanmoqda...</div>

	async function handleCourseSubmit(event, form) {
		event.preventDefault()
		if (form.id) {
			await api.updateCourse(token, form.id, form)
		} else {
			await api.createCourse(token, form)
		}
		setCourseModal(null)
		setBundle(await api.getSettings(token))
	}

	async function handleDeleteCourse(courseId) {
		await api.deleteCourse(token, courseId)
		setBundle(await api.getSettings(token))
	}

	async function handleTeacherSubmit(event, form) {
		event.preventDefault()
		if (!form.courseIds?.length) {
			await showError("O'qituvchiga kamida bitta kurs biriktiring")
			return
		}
		if (form.id) {
			await api.updateTeacher(token, form.id, form)
		} else {
			await api.createTeacher(token, form)
		}
		setTeacherModal(null)
		setBundle(await api.getSettings(token))
	}

	async function handleDeleteTeacher(teacherId) {
		const result = await api.deleteTeacher(token, teacherId)
		if (result.blocked) {
			await showError("Bu o'qituvchiga hali o'quvchilar biriktirilgan")
			return
		}
		setBundle(await api.getSettings(token))
	}

	return (
		<>
			<PageHeader
				title='Sozlamalar'
				subtitle='Direktor profili va tizim parametrlari'
			/>
			<ProfileSettingsCard
				token={token}
				meta={meta}
				title='Direktor profili'
				onProfileUpdated={onProfileUpdated}
			/>
			<section className='card table-card'>
				<div className='card-head-row'>
					<h3>Kurslar boshqaruvi</h3>
					<ActionButton
						icon='add'
						onClick={() =>
							setCourseModal({ title: '', monthlyFee: 0, schedule: '' })
						}
					>
						Yangi kurs
					</ActionButton>
				</div>
				<div className='table-shell'>
					<table>
						<thead>
							<tr>
								<th>Nomi</th>
								<th>Oylik to'lov</th>
								<th>Jadval</th>
								<th>Holat</th>
								<th>Amallar</th>
							</tr>
						</thead>
						<tbody>
							{bundle.courses.map(course => (
								<tr key={course.id}>
									<td data-label='Nomi'>{course.title}</td>
									<td data-label="Oylik to'lov">{formatMoney(course.monthlyFee)}</td>
									<td data-label='Jadval'>{course.schedule}</td>
									<td data-label='Holat'>
										<Badge tone={course.isActive ? 'success' : 'gray'}>
											{course.isActive ? 'Faol' : 'Ochiq emas'}
										</Badge>
									</td>
									<td data-label='Amallar'>
										<div className='table-actions'>
											<button
												type='button'
												onClick={() => setCourseModal({ ...course })}
											>
												<Icon name='edit' />
											</button>
											<button
												type='button'
												onClick={() => handleDeleteCourse(course.id)}
											>
												<Icon name='delete' />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
			<section className='card table-card'>
				<div className='card-head-row'>
					<h3>O'qituvchilar</h3>
					<ActionButton
						icon='person_add'
						onClick={() =>
							setTeacherModal({
								fullName: '',
								username: '',
								phone: '',
								password: '',
								courseIds: [],
							})
						}
					>
						Yangi o'qituvchi
					</ActionButton>
				</div>
				<div className='table-shell responsive-cards'>
					<table>
						<thead>
							<tr>
								<th>F.I.Sh</th>
								<th>Username</th>
								<th>Telefon</th>
								<th>Kurslar</th>
								<th>Amallar</th>
							</tr>
						</thead>
						<tbody>
							{bundle.teachers.map(teacher => (
								<tr key={teacher.id}>
									<td data-label='F.I.Sh'>{teacher.fullName}</td>
									<td data-label='Username'>{teacher.username}</td>
									<td data-label='Telefon'>{teacher.phone || '-'}</td>
									<td data-label='Kurslar'>
										{(teacher.courseIds || []).length
											? bundle.courses
													.filter(course =>
														(teacher.courseIds || []).includes(course.id),
													)
													.map(course => course.title)
													.join(', ')
											: '-'}
									</td>
									<td data-label='Amallar'>
										<div className='table-actions'>
											<button
												type='button'
												onClick={() =>
													setTeacherModal({
														...teacher,
														password: '',
														courseIds: teacher.courseIds || [],
													})
												}
											>
												<Icon name='edit' />
											</button>
											<button
												type='button'
												onClick={() => handleDeleteTeacher(teacher.id)}
											>
												<Icon name='delete' />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
			{courseModal ? (
				<CourseModal
					initialData={courseModal}
					onClose={() => setCourseModal(null)}
					onSubmit={handleCourseSubmit}
				/>
			) : null}
			{teacherModal ? (
				<TeacherModal
					initialData={teacherModal}
					courses={bundle.courses.filter(course => course.isActive)}
					onClose={() => setTeacherModal(null)}
					onSubmit={handleTeacherSubmit}
				/>
			) : null}
		</>
	)
}

function ProtectedApp({ auth, meta, onLogout, onProfileUpdated }) {
	const user = meta.user

	return (
		<RoleLayout user={user} onLogout={onLogout} token={auth.token}>
			<Routes>
				<Route
					path='/'
					element={<Navigate to={ROLE_DEFAULT_PATH[user.role]} replace />}
				/>

				<Route
					path='/student/dashboard'
					element={<StudentDashboardPage token={auth.token} />}
				/>
				<Route
					path='/student/attendance'
					element={<StudentAttendancePage token={auth.token} />}
				/>
				<Route
					path='/student/payments'
					element={<StudentPaymentsPage token={auth.token} />}
				/>
				<Route
					path='/student/schedule'
					element={<StudentSchedulePage token={auth.token} />}
				/>
				<Route
					path='/student/notifications'
					element={<StudentNotificationsPage token={auth.token} />}
				/>
				<Route
					path='/student/profile'
					element={<StudentProfilePage token={auth.token} />}
				/>

				<Route
					path='/reception/dashboard'
					element={<ReceptionDashboardPage token={auth.token} />}
				/>
				<Route
					path='/reception/students'
					element={<ReceptionStudentsPage token={auth.token} meta={meta} />}
				/>
				<Route
					path='/reception/payments'
					element={<ReceptionPaymentsPage token={auth.token} />}
				/>
				<Route
					path='/reception/requests'
					element={<ReceptionContactRequestsPage token={auth.token} />}
				/>
				<Route
					path='/reception/attendance'
					element={<ReceptionAttendancePage token={auth.token} />}
				/>
				<Route
					path='/reception/settings'
					element={
						<ReceptionSettingsPage
							token={auth.token}
							meta={meta}
							onProfileUpdated={onProfileUpdated}
						/>
					}
				/>

				<Route
					path='/teacher/dashboard'
					element={<TeacherDashboardPage token={auth.token} />}
				/>
				<Route
					path='/teacher/attendance'
					element={<TeacherAttendancePage token={auth.token} />}
				/>
				<Route
					path='/teacher/groups'
					element={<TeacherGroupsPage token={auth.token} />}
				/>
				<Route
					path='/teacher/statistics'
					element={<TeacherStatisticsPage token={auth.token} />}
				/>
				<Route
					path='/teacher/settings'
					element={
						<TeacherSettingsPage
							meta={meta}
							token={auth.token}
							onProfileUpdated={onProfileUpdated}
						/>
					}
				/>

				<Route
					path='/director/dashboard'
					element={<DirectorDashboardPage token={auth.token} />}
				/>
				<Route
					path='/director/students'
					element={<DirectorStudentsPage token={auth.token} />}
				/>
				<Route
					path='/director/payments'
					element={<DirectorPaymentsPage token={auth.token} />}
				/>
				<Route
					path='/director/attendance'
					element={<DirectorAttendancePage token={auth.token} />}
				/>
				<Route
					path='/director/statistics'
					element={<DirectorStatisticsPage token={auth.token} />}
				/>
				<Route
					path='/director/settings'
					element={
						<DirectorSettingsPage
							meta={meta}
							token={auth.token}
							onProfileUpdated={onProfileUpdated}
						/>
					}
				/>

				<Route
					path='*'
					element={<Navigate to={ROLE_DEFAULT_PATH[user.role]} replace />}
				/>
			</Routes>
		</RoleLayout>
	)
}

function AppInner() {
	const navigate = useNavigate()
	const [auth, setAuth] = useState(() => {
		const raw = localStorage.getItem('intelligent-auth')
		return raw ? JSON.parse(raw) : null
	})
	const [meta, setMeta] = useState(null)

	useEffect(() => {
		if (!auth?.token) {
			setMeta(null)
			return
		}

		api
			.getMeta(auth.token)
			.then(data => {
				if (!ROLE_DEFAULT_PATH[data.user.role]) {
					localStorage.removeItem('intelligent-auth')
					setAuth(null)
					setMeta(null)
					navigate('/', { replace: true })
					return
				}
				setMeta(data)
				if (
					window.location.pathname === '/admins' ||
					window.location.pathname === '/login'
				) {
					navigate(ROLE_DEFAULT_PATH[data.user.role], { replace: true })
				}
			})
			.catch(() => {
				localStorage.removeItem('intelligent-auth')
				setAuth(null)
				setMeta(null)
				navigate('/admins', { replace: true })
			})
	}, [auth?.token, navigate])

	function handleProfileUpdated(profile) {
		setMeta(current =>
			current
				? {
						...current,
						user: {
							...current.user,
							...profile,
						},
					}
				: current,
		)
	}

	function handleLogin(data) {
		localStorage.setItem('intelligent-auth', JSON.stringify(data))
		setAuth(data)
		navigate(ROLE_DEFAULT_PATH[data.user.role], { replace: true })
	}

	function handleLogout() {
		const target = auth?.user?.role === 'student' ? '/student/login' : '/admins'
		localStorage.removeItem('intelligent-auth')
		setAuth(null)
		setMeta(null)
		navigate(target, { replace: true })
	}

	if (!auth) {
		return (
			<Routes>
				<Route path='/' element={<HomePage />} />
				<Route path='/dasturchilar' element={<DevelopersPage />} />
				<Route path='/dasturchilar/:slug' element={<DeveloperDetailPage />} />
				<Route path='/dasturchilar/login' element={<DeveloperPortalPage />} />
				<Route path='/student/login' element={<StudentLoginPage onLogin={handleLogin} />} />
				<Route path='/register' element={<StudentRegisterPage />} />
				<Route path='/admins' element={<AdminLoginPage onLogin={handleLogin} />} />
				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
		)
	}

	if (!meta) {
		return <div className='loading-screen'>Yuklanmoqda...</div>
	}

	return (
		<Routes>
			<Route path='/' element={<HomePage />} />
			<Route path='/dasturchilar' element={<DevelopersPage />} />
			<Route path='/dasturchilar/:slug' element={<DeveloperDetailPage />} />
			<Route path='/dasturchilar/login' element={<DeveloperPortalPage />} />
			<Route
				path='/*'
				element={
					<ProtectedApp
						auth={auth}
						meta={meta}
						onLogout={handleLogout}
						onProfileUpdated={handleProfileUpdated}
					/>
				}
			/>
		</Routes>
	)
}

export default function App() {
	return (
		<BrowserRouter>
			<AppInner />
		</BrowserRouter>
	)
}
