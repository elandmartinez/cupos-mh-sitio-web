import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminUsers } from '../hooks/useAdminUsers';
import type { AdminUser } from '../hooks/useAdminUsers';
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

/** The create/edit form's fields. `password` is create-only (there is no
 *  password change in this panel — that lives in Supabase auth). */
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

  const titleId = useId();

  const isEditing = userDialog.value != null;
  const meta = loading ? undefined : t('adminPanel.count', { count: users.length });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSubmitError(null);
    setFieldErrors({});
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
      const result = await updateUser(user.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      });
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
            <div className="pageHeaderActions" style={{ marginBottom: 'var(--space-12)' }}>
              <Button variant="primary" icon="+" onClick={openCreate} aria-haspopup="dialog">
                {t('adminPanel.new')}
              </Button>
            </div>
            <ul className="salesList">
              {users.map((user) => (
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
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(user)}
                        aria-haspopup="dialog"
                      >
                        {t('common.edit')}
                      </Button>
                      {user.disabled ? (
                        <Button variant="ghost" size="sm" onClick={() => handleEnable(user)}>
                          {t('adminPanel.enable')}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => disableDialog.open(user)}
                          aria-haspopup="dialog"
                        >
                          {t('adminPanel.disable')}
                        </Button>
                      )}
                      <Button
                        variant="ghost-danger"
                        size="sm"
                        onClick={() => deleteDialog.open(user)}
                        aria-haspopup="dialog"
                      >
                        {t('adminPanel.deleteLabel')}
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
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

            {!isEditing && (
              <div className="fieldGroup">
                <label className="label" htmlFor={`${titleId}-password`}>
                  {t('adminPanel.password')}
                </label>
                <input
                  id={`${titleId}-password`}
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleTextChange}
                  autoComplete="new-password"
                  required
                  className="input"
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? `${titleId}-password-error` : undefined}
                />
                {fieldErrors.password && (
                  <FieldError id={`${titleId}-password-error`} message={fieldErrors.password} />
                )}
              </div>
            )}

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
