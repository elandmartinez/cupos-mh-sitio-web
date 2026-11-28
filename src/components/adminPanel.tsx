import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminUsers } from '../hooks/useAdminUsers';
import type { AdminUser, PatchAdminUserInput } from '../hooks/useAdminUsers';
import { usePresent } from '../hooks/usePresent';
import CollapsibleSection from './collapsibleSection';
import EmptyState from './emptyState';
import Button from './button';
import Modal from './modal';
import ConfirmModal from './confirmModal';
import { SkeletonList, FieldError } from './ui';

/**
 * The two roles the app acts on, as the create/edit form sends them. The
 * database stores them uppercase; anything else (including `null`) is treated
 * as `CUSTOMER` by the rest of the app — the safe, read-only side.
 */
type RoleValue = 'ADMIN' | 'CUSTOMER';

/** The create/edit form's fields. `password` is required on create and optional
 *  on edit (leave blank to keep the current password). */
interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: RoleValue;
}

const EMPTY_FORM: UserFormState = { name: '', email: '', password: '', role: 'CUSTOMER' };

/** Per-field validation messages, keyed by the field they concern. */
interface UserFieldErrors {
  email?: string;
  password?: string;
}

/** A user's human label: name → email → id prefix. */
function userLabel(user: AdminUser): string {
  return user.name || user.email || user.id.slice(0, 8);
}

/**
 * The row actions are icon-only (`.btnIcon` — see DESIGN.md §4): the label lives
 * in each button's `aria-label`/`title`, so the glyph below is decorative.
 * These inline 16px `fill="none"` SVGs match the stroke style used elsewhere
 * (`ui/fieldError.tsx`, `loginModal.tsx`) and are sized by `.btnIcon svg`.
 */
function EditIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M11.3 2.6 13.4 4.7 6.4 11.7 3 13l1.3-3.4L11.3 2.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M10.4 3.5 12.5 5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EnableIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DisableIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.8 3.8 12.2 12.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M2.5 4.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 2.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M5.5 4.5v8a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6.5 7.5v3M9.5 7.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Open-eye and crossed-out-eye glyphs for the password reveal toggle. */
function EyeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M6.4 3.5A6.8 6.8 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5a11.6 11.6 0 0 1-1.7 2.2M3.3 4.3A10.6 10.6 0 0 0 1.5 8S4 12.5 8 12.5c1 0 2-.3 2.9-.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 6.6a2 2 0 0 1-2.8 2.8M2 2l12 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The admin's "user management" section: the list of accounts plus the
 * create/edit modal, a disable confirm and a delete confirm. Self-contained —
 * it owns `useAdminUsers` and renders its own collapsible section and its
 * dialogs as siblings (so a dialog is never hidden by the section folding).
 */
export default function AdminPanel() {
  const { t } = useTranslation();
  const {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    setUserDisabled,
    deleteUser,
  } = useAdminUsers();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // `null` means "create"; an `AdminUser` means "edit" (see `usePresent`).
  const userDialog = usePresent<AdminUser | null>();
  const deleteDialog = usePresent<AdminUser>();
  const disableDialog = usePresent<AdminUser>();

  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<UserFieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  // Client-side search: filter the list by name or email.
  const [searchInput, setSearchInput] = useState('');
  const filteredUsers = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, searchInput]);

  const titleId = useId();

  const isEditing = userDialog.value != null;
  const meta = loading ? undefined : t('adminPanel.count', { count: filteredUsers.length });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSubmitError(null);
    setFieldErrors({});
    setShowPassword(false);
    userDialog.open(null);
  };

  const openEdit = (user: AdminUser) => {
    setForm({
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
      role: user.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
    });
    setSubmitError(null);
    setFieldErrors({});
    setShowPassword(false);
    userDialog.open(user);
  };

  /** Drop a field's error once the user edits it, so it clears as they fix it. */
  const clearFieldError = (name: keyof UserFieldErrors) => {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      setForm((prev) => ({ ...prev, name: value }));
    } else if (name === 'email') {
      setForm((prev) => ({ ...prev, email: value }));
      clearFieldError('email');
    } else if (name === 'password') {
      setForm((prev) => ({ ...prev, password: value }));
      clearFieldError('password');
    } else if (name === 'role') {
      setForm((prev) => ({ ...prev, role: value as RoleValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const errors: UserFieldErrors = {};
    if (!form.email.trim()) errors.email = t('adminPanel.emailRequired');
    if (!isEditing && !form.password) errors.password = t('adminPanel.passwordRequired');
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    if (isEditing) {
      const user = userDialog.value;
      if (!user) return;
      const patch: PatchAdminUserInput = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      // A blank password means "keep the current one"; only send it when set.
      if (form.password) patch.password = form.password;
      const result = await updateUser(user.id, patch);
      setSaving(false);
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      userDialog.close();
      return;
    }

    const result = await createUser({
      email: form.email.trim(),
      password: form.password,
      name: form.name.trim(),
      role: form.role,
    });
    setSaving(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    userDialog.close();
  };

  // Enabling is reversible and low-risk, so it applies directly. Disabling can
  // lock an operator out, so it gets a confirm first.
  const handleEnable = async (user: AdminUser) => {
    await setUserDisabled(user.id, false);
  };

  const handleConfirmDisable = async () => {
    const user = disableDialog.value;
    if (!user) return;
    disableDialog.close();
    await setUserDisabled(user.id, true);
  };

  const handleConfirmDelete = async () => {
    const user = deleteDialog.value;
    if (!user) return;
    deleteDialog.close();
    await deleteUser(user.id);
  };

  const userToDelete = deleteDialog.value;
  const userToDisable = disableDialog.value;

  return (
    <>
      <CollapsibleSection title={t('adminPanel.sectionTitle')} meta={meta}>

        {loading && users.length === 0 ? (
          <SkeletonList label={t('adminPanel.loading')} />
        ) : users.length === 0 ? (
          <EmptyState
            art="sales"
            title={t('adminPanel.emptyTitle')}
            body={t('adminPanel.emptyBody')}
            action={
              <Button variant="primary" icon="+" onClick={openCreate} aria-haspopup="dialog">
                {t('adminPanel.new')}
              </Button>
            }
          />
        ) : (
          <>

            <div style={{ display: 'flex', gap: 'var(--space-32)', width: '100%', justifyContent: "space-between", marginBottom: 'var(--space-12)' }}>
              <div className="filterRow">
                <div className="fieldGroup searchField">
                  <label className="label" htmlFor="adminUserSearch">
                    {t('adminPanel.searchLabel')}
                  </label>
                  <input
                    id="adminUserSearch"
                    className="input"
                    type="search"
                    placeholder={t('adminPanel.searchPlaceholder')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="pageHeaderActions" style={{ marginBottom: 'var(--space-12)' }}>
                <Button variant="primary" icon="+" onClick={openCreate} aria-haspopup="dialog">
                  {t('adminPanel.new')}
                </Button>
              </div>

            </div>

            {filteredUsers.length === 0 ? (
              <p className="fieldHint">{t('adminPanel.noResults')}</p>
            ) : (
            <ul className="salesList">
              {filteredUsers.map((user) => (
                <li key={user.id} className="salesListItem">
                  <div className="userRow">
                    <span className="userMain">
                      <span className="userName">{userLabel(user)}</span>
                      <span className="userMeta">{user.email || t('common.notAvailable')}</span>
                    </span>
                    <span className="userSide">
                      <span
                        className={`badge ${
                          user.role === 'ADMIN' ? 'badge--primary' : 'badge--neutral'
                        }`}
                      >
                        {user.role === 'ADMIN'
                          ? t('adminPanel.roleAdmin')
                          : t('adminPanel.roleCustomer')}
                      </span>
                      {user.disabled && (
                        <span className="badge badge--danger">{t('adminPanel.disabled')}</span>
                      )}
                    </span>
                    <span className="userActions">
                      <Button
                        variant="icon"
                        onClick={() => openEdit(user)}
                        aria-haspopup="dialog"
                        aria-label={t('common.edit')}
                        title={t('common.edit')}
                      >
                        <EditIcon />
                      </Button>
                      {user.disabled ? (
                        <Button
                          variant="icon"
                          onClick={() => handleEnable(user)}
                          aria-label={t('adminPanel.enable')}
                          title={t('adminPanel.enable')}
                        >
                          <EnableIcon />
                        </Button>
                      ) : (
                        <Button
                          variant="icon"
                          onClick={() => disableDialog.open(user)}
                          aria-haspopup="dialog"
                          aria-label={t('adminPanel.disable')}
                          title={t('adminPanel.disable')}
                        >
                          <DisableIcon />
                        </Button>
                      )}
                      <Button
                        variant="icon"
                        className="btnGhost--danger"
                        onClick={() => deleteDialog.open(user)}
                        aria-haspopup="dialog"
                        aria-label={t('adminPanel.deleteLabel')}
                        title={t('adminPanel.deleteLabel')}
                      >
                        <DeleteIcon />
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            )}
          </>
        )}
      </CollapsibleSection>

      {error && (
        <div className="banner banner--danger dashboardBanner" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => fetchUsers()} className="btnSecondary">
            {t('common.retry')}
          </button>
        </div>
      )}

      {userDialog.isPresent && (
        <Modal labelledBy={titleId} onClose={userDialog.close} closing={userDialog.isClosing}>
          <div className="formCardHeader">
            <h2 id={titleId}>
              {isEditing ? t('adminPanel.editTitle') : t('adminPanel.createTitle')}
            </h2>
            <Button
              variant="icon"
              className="btnClose"
              aria-label={t('common.close')}
              onClick={userDialog.close}
            >
              ×
            </Button>
          </div>

          {submitError && (
            <div className="banner banner--danger" role="alert">
              <p>{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <div className="fieldGroup">
              <label className="label" htmlFor={`${titleId}-name`}>
                {t('adminPanel.name')}
              </label>
              <input
                id={`${titleId}-name`}
                type="text"
                name="name"
                value={form.name}
                onChange={handleTextChange}
                autoComplete="off"
                className="input"
              />
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor={`${titleId}-email`}>
                {t('adminPanel.email')}
              </label>
              <input
                id={`${titleId}-email`}
                type="email"
                name="email"
                value={form.email}
                onChange={handleTextChange}
                autoComplete="off"
                required
                className="input"
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? `${titleId}-email-error` : undefined}
              />
              {fieldErrors.email && (
                <FieldError id={`${titleId}-email-error`} message={fieldErrors.email} />
              )}
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor={`${titleId}-password`}>
                {isEditing ? t('adminPanel.newPassword') : t('adminPanel.password')}
              </label>
              <div className="passwordField">
                <input
                  id={`${titleId}-password`}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleTextChange}
                  autoComplete="new-password"
                  required={!isEditing}
                  className="input"
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? `${titleId}-password-error` : undefined}
                />
                <button
                  type="button"
                  className="passwordToggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('adminPanel.hidePassword') : t('adminPanel.showPassword')}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {isEditing && <p className="fieldHint">{t('adminPanel.passwordHint')}</p>}
              {fieldErrors.password && (
                <FieldError id={`${titleId}-password-error`} message={fieldErrors.password} />
              )}
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor={`${titleId}-role`}>
                {t('adminPanel.role')}
              </label>
              <select
                id={`${titleId}-role`}
                name="role"
                value={form.role}
                onChange={handleTextChange}
                className="input"
              >
                <option value="ADMIN">{t('adminPanel.roleAdmin')}</option>
                <option value="CUSTOMER">{t('adminPanel.roleCustomer')}</option>
              </select>
            </div>

            <div className="buttonGroup">
              <Button variant="secondary" onClick={userDialog.close}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                {isEditing ? t('common.saveChanges') : t('adminPanel.create')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {userToDisable && (
        <ConfirmModal
          title={t('adminPanel.disableTitle')}
          message={t('adminPanel.disableMessage', { name: userLabel(userToDisable) })}
          confirmLabel={t('adminPanel.disableConfirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirmDisable}
          onCancel={disableDialog.close}
          closing={disableDialog.isClosing}
        />
      )}

      {userToDelete && (
        <ConfirmModal
          title={t('adminPanel.deleteTitle')}
          message={t('adminPanel.deleteMessage', { name: userLabel(userToDelete) })}
          confirmLabel={t('adminPanel.deleteConfirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirmDelete}
          onCancel={deleteDialog.close}
          closing={deleteDialog.isClosing}
        />
      )}
    </>
  );
}
