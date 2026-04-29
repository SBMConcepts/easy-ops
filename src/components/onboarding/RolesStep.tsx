import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Card, CardContent } from "../ui/card"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select"
import { Button } from "../ui/button"
import { Plus, Trash2, ShieldCheck } from "lucide-react"

import "../../styles/form.css"
import "../../styles/rolesstep.css"

export interface RoleData {
	name: string
	base_role: "admin" | "manager" | "supervisor" | "employee"
}

interface Props {
	data: RoleData[]
	onChange: (data: RoleData[]) => void
}

const BASE_ROLES = [
	{ value: "admin", label: "Admin", desc: "Full system access" },
	{ value: "manager", label: "Manager", desc: "Operational oversight" },
	{ value: "supervisor", label: "Supervisor", desc: "Team-level access" },
	{ value: "employee", label: "Employee", desc: "Self-service only" },
] as const

type BaseRole = (typeof BASE_ROLES)[number]["value"]

const EMPTY_ROLE: RoleData = {
	name: "",
	base_role: "employee",
}

const RolesStep = ({ data, onChange }: Props) => {
	const add = () => onChange([...data, { ...EMPTY_ROLE }])

	const remove = (i: number) => onChange(data.filter((_, idx) => idx !== i))

	const update = (i: number, field: keyof RoleData, value: string) => {
		const updated = [...data]
		updated[i] = { ...updated[i], [field]: value } as RoleData
		onChange(updated)
	}

	const resolvedRole = (base_role: BaseRole) =>
		BASE_ROLES.find((br) => br.value === base_role)

	return (
		<div className="roles-step">
			<p className="roles-step__desc">
				Define organisation-specific role titles. Each maps to a system
				permission level.
			</p>

			<div className="roles-step__list">
				{data.map((role, i) => {
					const resolved = resolvedRole(role.base_role)
					return (
						<Card key={i} className="role-card">
							<CardContent className="role-card__content">
								<div className="role-card__header">
									<span className="role-card__label">
										<ShieldCheck className="role-card__icon" />
										Role {i + 1}
										{role.name && (
											<span className="role-card__name-preview">
												— {role.name}
											</span>
										)}
									</span>
									{data.length > 1 && (
										<button
											className="role-card__remove"
											onClick={() => remove(i)}
											aria-label={`Remove role ${i + 1}`}>
											<Trash2 className="role-card__remove-icon" />
										</button>
									)}
								</div>

								<div className="role-card__row">
									<div className="form-field">
										<Label className="form-label form-label--required">
											Role Title
										</Label>
										<Input
											className="form-input"
											placeholder="e.g. Site Foreman"
											value={role.name}
											onChange={(e) => update(i, "name", e.target.value)}
										/>
									</div>

									<div className="form-field">
										<Label className="form-label">Permission Level</Label>
										<Select
											value={role.base_role}
											onValueChange={(v) =>
												update(i, "base_role", v as BaseRole)
											}>
											<SelectTrigger className="form-select-trigger">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="form-select-content">
												{BASE_ROLES.map((br) => (
													<SelectItem
														key={br.value}
														value={br.value}
														className="form-select-item">
														<span className="role-select-option">
															<span className="role-select-option__label">
																{br.label}
															</span>
															<span className="role-select-option__desc">
																{br.desc}
															</span>
														</span>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								{resolved && (
									<div className={`role-badge role-badge--${role.base_role}`}>
										<span className="role-badge__dot" />
										{resolved.label}
										<span className="role-badge__sep">·</span>
										{resolved.desc}
									</div>
								)}
							</CardContent>
						</Card>
					)
				})}
			</div>

			<Button variant="outline" onClick={add} className="roles-step__add-btn">
				<Plus className="h-4 w-4 mr-2" /> Add Role
			</Button>
		</div>
	)
}

export default RolesStep
